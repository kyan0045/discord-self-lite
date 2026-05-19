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
    this.requestQueue = [];
    this.processingQueue = false;

    // Circuit breaker state for heavily rate-limited routes
    this.circuitBreakers = new Map(); // routeKey -> { failures, lastFailure, openUntil }

    // Suspended routes - temporarily disabled endpoints
    this.suspendedRoutes = new Map(); // routeKey -> { suspendedUntil, reason }
  }

  /**
   * Make a request to the Discord API with rate limiting
   * @param {string} endpoint - API endpoint
   * @param {object} [options={}] - Request options
   * @returns {Promise<object|null>} Response data or null for 204 responses
   * @throws {Error} If the request fails
   */
  async request(endpoint, options = {}) {
    // Check rate limits before queuing the request with more aggressive logic
    const method = options.method || "GET";
    const routeKey = this.getRouteKey(endpoint, method);

    // Check circuit breaker - reject immediately if route is temporarily disabled
    const circuitBreaker = this.circuitBreakers.get(routeKey);
    if (circuitBreaker && circuitBreaker.openUntil > Date.now()) {
      const remainingTime = circuitBreaker.openUntil - Date.now();
      console.log(
        `🚫 Request dropped: Circuit breaker open for ${routeKey} (${Math.round(remainingTime / 1000)}s remaining)`,
      );
      return Promise.resolve(null);
    }

    // Check if route is suspended - silently reject to avoid spam
    const suspendedRoute = this.suspendedRoutes.get(routeKey);
    if (suspendedRoute && suspendedRoute.suspendedUntil > Date.now()) {
      const remainingTime = suspendedRoute.suspendedUntil - Date.now();
      console.log(
        `🚫 Request dropped: Route ${routeKey} is suspended for ${Math.round(remainingTime / 1000)}s`,
      );
      return Promise.resolve(null);
    }

    // Check rate limits - if rate limited, suspend immediately instead of waiting
    if (this.isRateLimited(endpoint, method)) {
      const suspensionTime = 2 * 60 * 1000; // 2 minutes
      this.suspendedRoutes.set(routeKey, {
        suspendedUntil: Date.now() + suspensionTime,
        reason: "Rate limited - pre-emptive suspension",
      });

      console.log(
        `⏸️  Suspending route ${routeKey} for 2 minutes (pre-emptive)`,
      );

      // Clear queued requests for this route
      const clearedCount = this.clearQueuedRequestsForRoute(routeKey);
      if (clearedCount > 0) {
        console.log(
          `🗑️ Cleared ${clearedCount} queued requests for suspended route ${routeKey}`,
        );
      }

      console.log(`🚫 Request dropped: Route suspended for ${routeKey}`);
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      // Prevent queue from growing too large during rate limit storms
      if (this.requestQueue.length >= 50) {
        console.log(
          `🚫 Request dropped: Queue full (${this.requestQueue.length} requests)`,
        );
        resolve(null);
        return;
      }

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

    // Filter out suspended routes before processing any requests
    this.requestQueue = this.requestQueue.filter((request) => {
      const routeKey = this.getRouteKey(
        request.endpoint,
        request.options.method || "GET",
      );
      const suspendedRoute = this.suspendedRoutes.get(routeKey);

      if (suspendedRoute && suspendedRoute.suspendedUntil > Date.now()) {
        // Silently resolve suspended requests
        console.log(
          `🚫 Queued request dropped: Route ${routeKey} is suspended`,
        );
        request.resolve(null);
        return false; // Remove from queue
      }

      return true; // Keep in queue
    });

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
        const routeKey = this.getRouteKey(endpoint, options.method || "GET");

        // Check suspension status before processing
        const suspendedRoute = this.suspendedRoutes.get(routeKey);
        if (suspendedRoute && suspendedRoute.suspendedUntil > Date.now()) {
          console.log(
            `🚫 Processing request dropped: Route ${routeKey} is suspended`,
          );
          resolve(null);
          continue;
        }

        // Check rate limit before processing - suspend immediately if exhausted
        const rateLimit = this.rateLimits.get(routeKey);
        if (
          rateLimit &&
          rateLimit.remaining <= 0 &&
          Date.now() < rateLimit.reset
        ) {
          // Suspend instead of waiting
          const suspensionTime = 2 * 60 * 1000; // 2 minutes
          this.suspendedRoutes.set(routeKey, {
            suspendedUntil: Date.now() + suspensionTime,
            reason: "Rate limit exhausted during queue processing",
          });

          console.log(
            `⏸️  Suspending route ${routeKey} for 2 minutes (queue processing)`,
          );

          // Clear remaining queued requests for this route
          const clearedCount = this.clearQueuedRequestsForRoute(routeKey);
          if (clearedCount > 0) {
            console.log(
              `🗑️ Cleared ${clearedCount} additional queued requests for ${routeKey}`,
            );
          }

          resolve(null);
          continue;
        }

        const result = await this.makeRequest(endpoint, options);
        resolve(result);

        // Delay between requests to be conservative with rate limits
        await this.sleep(500);
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
            parseInt(response.headers.get("retry-after")) * 1000 || 2000;
          const isGlobal =
            response.headers.get("x-ratelimit-global") === "true";
          const routeKey = this.getRouteKey(endpoint, options.method || "GET");

          console.log(
            `🚫 Rate limited! ${
              isGlobal ? "Global" : `Route (${routeKey})`
            } limit for ${endpoint}`,
          );

          if (isGlobal) {
            this.globalRateLimit = { reset: Date.now() + retryAfter + 2000 };
            console.log(
              `⏳ Global rate limit set, waiting ${retryAfter + 2000}ms`,
            );
          } else {
            const suspensionTime = retryAfter + 500;
            this.suspendedRoutes.set(routeKey, {
              suspendedUntil: Date.now() + suspensionTime,
              reason: `429 response on attempt ${attempt + 1}`,
            });

            console.log(
              `⏸️  Suspending route ${routeKey} for ${suspensionTime}ms (429 response)`,
            );

            // Clear queue for this route
            const clearedCount = this.clearQueuedRequestsForRoute(routeKey);
            if (clearedCount > 0) {
              console.log(
                `�️ Cleared ${clearedCount} queued requests for ${routeKey}`,
              );
            }

            // Update rate limit state
            this.rateLimits.set(routeKey, {
              remaining: 0,
              reset: Date.now() + suspensionTime,
              limit: this.rateLimits.get(routeKey)?.limit || 5,
              updatedAt: Date.now(),
            });

            // Open circuit breaker after 2 consecutive 429s
            const breaker = this.circuitBreakers.get(routeKey) || {
              failures: 0,
              lastFailure: 0,
              openUntil: 0,
            };
            breaker.failures++;
            breaker.lastFailure = Date.now();

            if (breaker.failures >= 2) {
              breaker.openUntil = Date.now() + suspensionTime;
              console.log(`🔌 Circuit breaker OPENED for ${routeKey}`);
            }

            this.circuitBreakers.set(routeKey, breaker);

            // Don't retry, return null immediately
            return null;
          }

          // For global rate limits, wait and retry
          if (isGlobal) {
            await this.sleep(retryAfter + 2000);
            attempt++;
            continue;
          }

          // For route rate limits, don't retry
          return null;
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
          // Reset circuit breaker and suspension on successful response
          const routeKey = this.getRouteKey(endpoint, options.method || "GET");
          this.circuitBreakers.delete(routeKey);
          this.suspendedRoutes.delete(routeKey);
          return null;
        }

        // Reset circuit breaker and suspension on successful response
        const routeKey = this.getRouteKey(endpoint, options.method || "GET");
        this.circuitBreakers.delete(routeKey);
        this.suspendedRoutes.delete(routeKey);

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

    // Clean up expired circuit breakers
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      if (now > breaker.openUntil) {
        this.circuitBreakers.delete(key);
      }
    }

    // Clean up expired route suspensions
    for (const [key, suspension] of this.suspendedRoutes.entries()) {
      if (now > suspension.suspendedUntil) {
        this.suspendedRoutes.delete(key);
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
   * Clear queued requests for a specific route
   * @private
   * @param {string} routeKey - The route key to clear requests for
   * @returns {number} Number of requests cleared
   */
  clearQueuedRequestsForRoute(routeKey) {
    const initialLength = this.requestQueue.length;
    this.requestQueue = this.requestQueue.filter((request) => {
      const requestRouteKey = this.getRouteKey(
        request.endpoint,
        request.options.method || "GET",
      );
      return requestRouteKey !== routeKey;
    });
    return initialLength - this.requestQueue.length;
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
