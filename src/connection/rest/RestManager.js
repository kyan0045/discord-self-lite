const sendMessage = require("./methods/sendMessage");
const react = require("./methods/react");
const clickButton = require("./methods/clickButton");
const fetchGuildMembers = require("./methods/fetchGuildMembers");
const fetchGuildMember = require("./methods/fetchGuildMember");
const fetchUser = require("./methods/fetchUser");
const createDM = require("./methods/createDM");
const DiscordAPIError = require("../../classes/DiscordAPIError");

/**
 * Manages REST API requests to Discord with proper rate limiting
 */
class RestManager {
  /**
   * Create a new RestManager instance
   * @param {string} token - Discord token
   * @param {number} [apiVersion=9] - Discord API version
   */
  constructor(token, apiVersion = 9) {
    this.token = token;
    this.baseURL = `https://discord.com/api/v${apiVersion}`;

    // Rate limiting state
    this.rateLimits = new Map(); // endpoint -> { remaining, reset, retryAfter }
    this.globalRateLimit = null; // { reset }
    this.globalDelay = null;
    this.requestQueues = new Map(); // routeKey -> queued requests
    this.processingRoutes = new Set();
  }

  /**
   * Make a request to the Discord API with rate limiting
   * @param {string} endpoint - API endpoint
   * @param {object} [options={}] - Request options
   * @returns {Promise<object|null>} Response data or null for 204 responses
   * @throws {Error} If the request fails
   */
  async request(endpoint, options = {}) {
    const routeKey = this.getRouteKey(endpoint, options.method || "GET");
    let queue = this.requestQueues.get(routeKey);
    if (!queue) {
      queue = [];
      this.requestQueues.set(routeKey, queue);
    }

    return new Promise((resolve, reject) => {
      // Prevent queue from growing too large during rate limit storms
      if (queue.length >= 50) {
        console.log(
          `🚫 Request dropped: Queue full for ${routeKey} (${queue.length} requests)`,
        );
        resolve(null);
        return;
      }

      queue.push({
        endpoint,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      this.processQueue(routeKey);
    });
  }

  /**
   * Process the request queue with rate limiting
   * @private
   */
  async processQueue(routeKey) {
    const queue = this.requestQueues.get(routeKey);
    if (!queue || queue.length === 0 || this.processingRoutes.has(routeKey)) {
      return;
    }

    this.processingRoutes.add(routeKey);

    while (queue.length > 0) {
      await this.waitForGlobalRateLimit();

      const request = queue.shift();
      const { endpoint, options, resolve, reject } = request;

      try {
        // Wait for the known bucket reset instead of dropping the request.
        const rateLimit = this.rateLimits.get(routeKey);
        if (
          rateLimit &&
          rateLimit.remaining <= 0 &&
          Date.now() < rateLimit.reset
        ) {
          const delay = rateLimit.reset - Date.now();
          console.log(`⏳ Route ${routeKey} rate limited, waiting ${delay}ms`);
          await this.sleep(delay);
          this.rateLimits.delete(routeKey);
        }

        const result = await this.makeRequest(endpoint, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processingRoutes.delete(routeKey);
    this.requestQueues.delete(routeKey);
  }

  /**
   * Wait for a shared global rate limit to expire
   * @private
   */
  async waitForGlobalRateLimit() {
    while (this.globalRateLimit && Date.now() < this.globalRateLimit.reset) {
      const delay = this.globalRateLimit.reset - Date.now();
      console.log(`⏳ Global rate limit active, waiting ${delay}ms`);

      if (!this.globalDelay) {
        this.globalDelay = this.sleep(delay).finally(() => {
          this.globalDelay = null;
          if (
            this.globalRateLimit &&
            Date.now() >= this.globalRateLimit.reset
          ) {
            this.globalRateLimit = null;
          }
        });
      }

      await this.globalDelay;
    }
  }

  /**
   * Make the actual HTTP request
   * @private
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const headers = {
          Authorization: this.token,
          ...options.headers,
        };

        if (!(options.body instanceof FormData)) {
          headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, {
          ...options,
          headers,
        });

        // Update rate limit info from headers
        this.updateRateLimits(
          endpoint,
          options.method || "GET",
          response.headers,
        );

        // Handle rate limiting
        if (response.status === 429) {
          const error = await response.json().catch(() => ({}));
          const bodyRetryAfter = Number(error.retry_after);
          const resetAfter = parseFloat(
            response.headers.get("x-ratelimit-reset-after"),
          );
          const headerRetryAfter = parseFloat(
            response.headers.get("retry-after"),
          );
          const retryAfterSeconds = Number.isFinite(bodyRetryAfter)
            ? bodyRetryAfter
            : Number.isFinite(resetAfter)
              ? resetAfter
              : headerRetryAfter;
          const retryAfter = Number.isFinite(retryAfterSeconds)
            ? Math.max(0, retryAfterSeconds * 1000)
            : 2000;
          const isGlobal =
            response.headers.get("x-ratelimit-global") === "true" ||
            error.global === true;
          const routeKey = this.getRouteKey(endpoint, options.method || "GET");

          console.log(
            `🚫 Rate limited! ${
              isGlobal ? "Global" : `Route (${routeKey})`
            } limit for ${endpoint}`,
          );

          if (isGlobal) {
            this.globalRateLimit = { reset: Date.now() + retryAfter };
            console.log(`⏳ Global rate limit set, waiting ${retryAfter}ms`);
          } else {
            this.rateLimits.set(routeKey, {
              remaining: 0,
              reset: Date.now() + retryAfter,
              limit: this.rateLimits.get(routeKey)?.limit || 5,
              updatedAt: Date.now(),
            });
          }

          console.log(`⏳ Retrying ${routeKey} in ${retryAfter}ms`);
          if (isGlobal) {
            await this.waitForGlobalRateLimit();
          } else {
            await this.sleep(retryAfter);
          }
          continue;
        }

        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ message: "Unknown error" }));
          throw new DiscordAPIError(
            error.message,
            response.status,
            endpoint,
            error,
          );
        }

        // Handle 204 No Content (successful but no body)
        if (response.status === 204) {
          return null;
        }

        return await response.json();
      } catch (error) {
        // Do not retry on Missing Permissions (50013)
        if (
          error.name === "DiscordAPIError" &&
          error.fullError &&
          error.fullError.code === 50013
        ) {
          throw error;
        }

        if (attempt === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff for retries
        const delay = Math.pow(2, attempt) * 1000;
        console.log(
          `🔄 Request failed, retrying in ${delay}ms (attempt ${
            attempt + 1
          }/${maxRetries})`,
        );
        await this.sleep(delay);
        attempt++;
      }
    }
  }

  /**
   * Update rate limit state from response headers
   * @private
   */
  updateRateLimits(endpoint, method, headers) {
    const routeKey = this.getRouteKey(endpoint, method);

    const remaining = parseInt(headers.get("x-ratelimit-remaining"));
    const resetTimestamp = parseFloat(headers.get("x-ratelimit-reset"));
    const resetAfter = parseFloat(headers.get("x-ratelimit-reset-after"));
    const limit = parseInt(headers.get("x-ratelimit-limit"));

    if (!isNaN(remaining) && (!isNaN(resetAfter) || !isNaN(resetTimestamp))) {
      const serverTime = Date.parse(headers.get("date"));
      const clockOffset = Number.isNaN(serverTime)
        ? 0
        : serverTime - Date.now();

      this.rateLimits.set(routeKey, {
        remaining,
        reset: !isNaN(resetAfter)
          ? Date.now() + resetAfter * 1000
          : resetTimestamp * 1000 - clockOffset,
        limit,
        updatedAt: Date.now(),
      });

      // Clean up old rate limit entries
      this.cleanupRateLimits();
    }
  }

  /**
   * Get route key for rate limiting
   * @private
   */
  getRouteKey(endpoint, method) {
    const majorParameters = new Set(["channels", "guilds"]);
    const segments = endpoint.split("?", 1)[0].split("/");
    const normalized = [];

    for (let index = 0; index < segments.length; index++) {
      if (segments[index - 1] === "reactions") break;

      const segment = segments[index];
      const isMinorId =
        /^\d{16,19}$/.test(segment) &&
        !majorParameters.has(segments[index - 1]);
      normalized.push(isMinorId ? "{id}" : segment);
    }

    return `${method.toUpperCase()}:${normalized.join("/")}`;
  }

  /**
   * Clean up expired rate limit entries
   * @private
   */
  cleanupRateLimits() {
    const now = Date.now();
    for (const [key, rateLimit] of this.rateLimits.entries()) {
      if (now > rateLimit.reset) {
        this.rateLimits.delete(key);
      }
    }
  }

  /**
   * Sleep for a specified number of milliseconds
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if a route is currently rate limited
   * @param {string} endpoint - The API endpoint
   * @param {string} method - The HTTP method
   * @returns {boolean} True if rate limited
   */
  isRateLimited(endpoint, method = "GET") {
    // Check global rate limit
    if (this.globalRateLimit && Date.now() < this.globalRateLimit.reset) {
      return true;
    }

    // Check route-specific rate limit
    const routeKey = this.getRouteKey(endpoint, method);
    const rateLimit = this.rateLimits.get(routeKey);

    return (
      rateLimit && rateLimit.remaining <= 0 && Date.now() < rateLimit.reset
    );
  }

  /**
   * Get rate limit status for debugging
   * @param {string} endpoint - The API endpoint
   * @param {string} method - The HTTP method
   * @returns {object} Rate limit information
   */
  getRateLimitStatus(endpoint, method = "GET") {
    const routeKey = this.getRouteKey(endpoint, method);
    const rateLimit = this.rateLimits.get(routeKey);
    const routeQueueLength = this.requestQueues.get(routeKey)?.length || 0;
    const queueLength = Array.from(this.requestQueues.values()).reduce(
      (total, queue) => total + queue.length,
      0,
    );

    return {
      routeKey,
      endpoint,
      method,
      isGloballyLimited:
        this.globalRateLimit && Date.now() < this.globalRateLimit.reset,
      globalReset: this.globalRateLimit
        ? new Date(this.globalRateLimit.reset)
        : null,
      isRouteLimited:
        rateLimit && rateLimit.remaining <= 0 && Date.now() < rateLimit.reset,
      routeLimit: rateLimit
        ? {
            remaining: rateLimit.remaining,
            limit: rateLimit.limit,
            reset: new Date(rateLimit.reset),
            resetIn: Math.max(0, rateLimit.reset - Date.now()),
          }
        : null,
      queueLength,
      routeQueueLength,
      isProcessing: this.processingRoutes.size > 0,
      isRouteProcessing: this.processingRoutes.has(routeKey),
    };
  }

  /**
   * Send a message to a channel
   * @param {string} channelId - The channel ID
   * @param {string|object} payload - Message content or payload object
   * @returns {Promise<object>} The sent message data
   */
  async sendMessage(channelId, payload) {
    return await sendMessage(this, channelId, payload);
  }

  /**
   * Fetch a user by ID
   * @param {string} userId
   * @returns {Promise<object>} User data
   */
  async fetchUser(userId) {
    return await fetchUser(this, userId);
  }

  /**
   * Create a DM channel with a user
   * @param {string} recipientId
   * @returns {Promise<object>} Channel data
   */
  async createDM(recipientId) {
    return await createDM(this, recipientId);
  }

  /**
   * Fetch webhooks for a channel
   * @param {string} channelId - The channel ID
   * @returns {Promise<Array>} Webhook data array
   */
  async fetchWebhooks(channelId) {
    return await this.request(`/channels/${channelId}/webhooks`);
  }

  /**
   * Create a webhook in a channel
   * @param {string} channelId - The channel ID
   * @param {string} name - Webhook name
   * @param {object} [options={}] - Webhook options
   * @param {string} [options.avatar] - Webhook avatar payload
   * @param {string} [options.reason] - Audit log reason
   * @returns {Promise<object>} Created webhook data
   */
  async createWebhook(channelId, name, options = {}) {
    const headers = {};
    if (options.reason) {
      headers["X-Audit-Log-Reason"] = encodeURIComponent(options.reason);
    }

    const body = { name };
    const avatar = options.avatar || options.avatarURL;
    if (avatar) {
      body.avatar = avatar;
    }

    return await this.request(`/channels/${channelId}/webhooks`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  /**
   * Edit a message in a channel
   * @param {string} channelId - The channel ID
   * @param {string} messageId - The message ID
   * @param {string|object} payload - New message content or payload object
   * @returns {Promise<object>} The updated message data
   */
  async editMessage(channelId, messageId, payload) {
    const updatedData = await this.request(
      `/channels/${channelId}/messages/${messageId}`,
      {
        method: "PATCH",
        body: JSON.stringify(
          typeof payload === "string" ? { content: payload } : payload,
        ),
      },
    );
    return updatedData;
  }

  /**
   * Delete a message from a channel
   * @param {string} channelId - The channel ID
   * @param {string} messageId - The message ID
   * @returns {Promise<void>}
   */
  async deleteMessage(channelId, messageId) {
    await this.request(`/channels/${channelId}/messages/${messageId}`, {
      method: "DELETE",
    });
  }

  /**
   * React to a message
   * @param {string} channelId - The channel ID
   * @param {string} messageId - The message ID
   * @param {string} emoji - The emoji to react with
   * @returns {Promise<void>}
   */
  async react(channelId, messageId, emoji) {
    return await react(this, channelId, messageId, emoji);
  }

  /**
   * Fetch guild data from the API
   * @param {string} guildId - The guild ID
   * @returns {Promise<object>} Guild data
   */
  async fetchGuild(guildId) {
    return await this.request(`/guilds/${guildId}`);
  }

  /**
   * Fetch channel data from the API
   * @param {string} channelId - The channel ID
   * @returns {Promise<object>} Channel data
   */
  async fetchChannel(channelId) {
    return await this.request(`/channels/${channelId}`);
  }

  /**
   * Fetch all channels for a guild
   * @param {string} guildId - The guild ID
   * @returns {Promise<Array>} Array of channel data
   */
  async fetchChannels(guildId) {
    return await this.request(`/guilds/${guildId}/channels`);
  }

  /**
   * Fetch guild members
   * @param {string} guildId - The guild ID
   * @param {object} [options={}] - Fetch options
   * @param {number} [options.limit=1000] - Number of members to fetch
   * @param {string} [options.after] - Member ID to fetch after
   * @returns {Promise<Array>} Array of member data
   */
  async fetchGuildMembers(guildId, options = {}) {
    return await fetchGuildMembers(this, guildId, options);
  }

  /**
   * Fetch the current user's member information for a guild
   * @param {string} guildId - The guild ID
   * @returns {Promise<object>} Member data
   */
  async fetchGuildMember(guildId) {
    return await fetchGuildMember(this, guildId);
  }

  /**
   * Fetch a specific message from a channel
   * @param {string} channelId - The channel ID
   * @param {string} messageId - The message ID
   * @returns {Promise<object>} Message data
   */
  async fetchMessage(channelId, messageId) {
    const messages = await this.request(
      `/channels/${channelId}/messages?limit=1&around=${messageId}`,
    );
    if (Array.isArray(messages)) {
      const message = messages.find((m) => m.id === messageId);
      if (message) return message;
    }
    throw new DiscordAPIError(
      "Unknown Message",
      404,
      `/channels/${channelId}/messages/${messageId}`,
      { message: "Unknown Message", code: 10008 },
    );
  }

  /**
   * Fetch messages from a channel
   * @param {string} channelId - The channel ID
   * @param {object} [options={}] - Fetch options
   * @param {number} [options.limit] - Number of messages to fetch
   * @param {string} [options.before] - Fetch messages before this message ID
   * @param {string} [options.after] - Fetch messages after this message ID
   * @returns {Promise<Array>} Array of message data
   */
  async fetchMessages(channelId, options = {}) {
    const query = new URLSearchParams(options).toString();
    return await this.request(`/channels/${channelId}/messages?${query}`);
  }

  /**
   * Click a button on a message (interaction)
   * @param {string} channelId - The channel ID
   * @param {string} messageId - The message ID
   * @param {string} applicationId - The application ID
   * @param {string} guildId - The guild ID
   * @param {string} customId - The button's custom ID
   * @param {string} sessionId - The session ID
   * @param {number} [messageFlags=0] - Message flags
   * @returns {Promise<object>} Interaction response
   */
  async clickButton(
    channelId,
    messageId,
    applicationId,
    guildId,
    customId,
    sessionId,
    messageFlags = 0,
  ) {
    return await clickButton(
      this,
      channelId,
      messageId,
      applicationId,
      guildId,
      customId,
      sessionId,
      messageFlags,
    );
  }
}

module.exports = RestManager;
