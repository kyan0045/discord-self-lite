const sendMessage = require("./methods/sendMessage");
const react = require("./methods/react");
const clickButton = require("./methods/clickButton");
const fetchGuildMembers = require("./methods/fetchGuildMembers");
const fetchGuildMember = require("./methods/fetchGuildMember");
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
    this.requestQueue = [];
    this.processingQueue = false;
  }

  /**
   * Make a request to the Discord API with rate limiting
   * @param {string} endpoint - API endpoint
   * @param {object} [options={}] - Request options
   * @returns {Promise<object|null>} Response data or null for 204 responses
   * @throws {Error} If the request fails
   */
  async request(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        endpoint,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      this.processQueue();
    });
  }

  /**
   * Process the request queue with rate limiting
   * @private
   */
  async processQueue() {
    if (this.processingQueue || this.requestQueue.length === 0) {
      return;
    }

    // Check if we're globally rate limited before starting
    if (this.globalRateLimit && Date.now() < this.globalRateLimit.reset) {
      const delay = this.globalRateLimit.reset - Date.now();
      console.log(
        `⏳ Global rate limit active, waiting ${delay}ms before processing queue`,
      );
      setTimeout(() => this.processQueue(), delay);
      return;
    }

    this.processingQueue = true;

    while (this.requestQueue.length > 0) {
      // Double-check global rate limit for each request
      if (this.globalRateLimit && Date.now() < this.globalRateLimit.reset) {
        const delay = this.globalRateLimit.reset - Date.now();
        console.log(`⏳ Global rate limit active, waiting ${delay}ms`);
        await this.sleep(delay);
        this.globalRateLimit = null;
      }

      const request = this.requestQueue.shift();
      const { endpoint, options, resolve, reject } = request;

      try {
        // Check endpoint-specific rate limit
        const routeKey = this.getRouteKey(endpoint, options.method || "GET");
        const rateLimit = this.rateLimits.get(routeKey);

        if (
          rateLimit &&
          rateLimit.remaining <= 0 &&
          Date.now() < rateLimit.reset
        ) {
          const delay = rateLimit.reset - Date.now();
          console.log(
            `⏳ Route rate limit for ${routeKey} (${endpoint}), waiting ${delay}ms`,
          );
          await this.sleep(delay);

          // After waiting, check if we still have remaining requests
          const updatedRateLimit = this.rateLimits.get(routeKey);
          if (updatedRateLimit && updatedRateLimit.remaining <= 0) {
            // Still rate limited, put request back at front of queue
            this.requestQueue.unshift(request);
            continue;
          }
        }

        const result = await this.makeRequest(endpoint, options);
        resolve(result);

        // Small delay between requests to be nice to Discord
        await this.sleep(100);
      } catch (error) {
        reject(error);
      }
    }

    this.processingQueue = false;
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
        const response = await fetch(url, {
          ...options,
          headers: {
            Authorization: this.token,
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        // Update rate limit info from headers
        this.updateRateLimits(
          endpoint,
          options.method || "GET",
          response.headers,
        );

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter =
            parseInt(response.headers.get("retry-after")) * 1000 + 1000;
          const isGlobal =
            response.headers.get("x-ratelimit-global") === "true";
          const routeKey = this.getRouteKey(endpoint, options.method || "GET");

          console.log(
            `🚫 Rate limited! ${
              isGlobal ? "Global" : `Route (${routeKey})`
            } limit for ${endpoint}, retry after ${retryAfter}ms`,
          );

          if (isGlobal) {
            this.globalRateLimit = { reset: Date.now() + retryAfter };
          } else {
            // Update route-specific rate limit for 429 responses
            this.rateLimits.set(routeKey, {
              remaining: 0,
              reset: Date.now() + retryAfter,
              limit: this.rateLimits.get(routeKey)?.limit || 5, // Default limit if unknown
              updatedAt: Date.now(),
            });
          }

          await this.sleep(retryAfter);
          attempt++;
          continue;
        }

        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ message: "Unknown error" }));
          throw new DiscordAPIError(error.message, response.status, endpoint);
        }

        // Handle 204 No Content (successful but no body)
        if (response.status === 204) {
          return null;
        }

        return await response.json();
      } catch (error) {
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
    const limit = parseInt(headers.get("x-ratelimit-limit"));

    if (!isNaN(remaining) && !isNaN(resetTimestamp)) {
      this.rateLimits.set(routeKey, {
        remaining,
        reset: resetTimestamp * 1000, // Convert to milliseconds
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
    // Normalize endpoint for rate limiting
    // Replace IDs with generic placeholders
    const normalized = endpoint
      .replace(/\/\d+/g, "/{id}")
      .replace(
        /\/channels\/\{id\}\/messages\/\{id\}/g,
        "/channels/{id}/messages/{id}",
      );

    return `${method.toUpperCase()}:${normalized}`;
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
      queueLength: this.requestQueue.length,
      isProcessing: this.processingQueue,
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
    return await this.request(`/channels/${channelId}/messages/${messageId}`);
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
