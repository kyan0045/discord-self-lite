const { EventEmitter } = require("events");
const DiscordWebSocket = require("../connection/ws/WebSocket");
const RestManager = require("../connection/rest/RestManager");
const Guild = require("./Guild");
const Channel = require("./Channel");
const Message = require("./Message");
const User = require("./User");
const RestManagerDestroyedError = require("./RestManagerDestroyedError");

/**
 * The main client for connecting to Discord
 * @extends EventEmitter
 */
class Client extends EventEmitter {
  /**
   * Create a new Discord client
   * @param {object} [options={}] - Client options
   * @param {number} [options.apiVersion=9] - Discord API version to use
   * @param {object} [options.presence] - Presence data to send to Discord
   * @param {number} [options.maxReconnectAttempts=5] - Maximum gateway
   * reconnect attempts. Use Infinity to keep retrying with capped backoff.
   * @param {object} [options.ws] - WebSocket connection options
   * @param {typeof RestManager} [options.restClass=RestManager] - REST manager
   * class to instantiate. Subclasses can add a send queue or other transport
   * behaviour without patching the library.
   */
  constructor(options = {}) {
    super();
    this.options = {
      apiVersion: 9,
      presence: {
        status: "online",
        since: 0,
        activities: [],
        afk: false,
      },
      maxReconnectAttempts: 5,
      ws: {},
      restClass: RestManager,
      ...options,
    };
    this.options.maxReconnectAttempts ??= 5;

    if (typeof this.options.restClass !== "function") {
      throw new TypeError("options.restClass must be a constructor");
    }

    if (
      typeof this.options.maxReconnectAttempts !== "number" ||
      Number.isNaN(this.options.maxReconnectAttempts) ||
      (this.options.maxReconnectAttempts !== Infinity &&
        !Number.isInteger(this.options.maxReconnectAttempts)) ||
      this.options.maxReconnectAttempts < 0
    ) {
      throw new TypeError(
        "options.maxReconnectAttempts must be a non-negative integer or Infinity",
      );
    }

    this.token = null;
    this.ws = null;
    this.rest = null;
    this._loginReject = null;
    this._awaitCleanups = new Set();
    this.guilds = new Map(); // Cache for Guild instances
    this.channels = new Map(); // Cache for Channel instances
    this.users = new Map(); // Cache for User instances
    this.sessionId = null; // Will be set from WebSocket READY event
    this.user = null; // Will be set from WebSocket READY event
  }

  /**
   * Login to Discord with a user token
   * @param {string} token - The Discord user token
   * @returns {Promise<void>}
   */
  async login(token) {
    if (this._loginReject) {
      this._loginReject(new Error("Login superseded by a new login() call"));
    }
    this.rest?.destroy?.();

    this.token = token;
    this.rest = new this.options.restClass(
      this.token,
      this.options.apiVersion || 9,
    );
    this.rest.onDebug = (msg) => this.emit("debug", msg);

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this._loginReject = null;
        this.removeListener("ready", onReady);
        this.removeListener("error", onError);
      };

      const onReady = () => {
        cleanup();
        resolve();
      };

      const onError = (msg) => {
        const error = msg instanceof Error ? msg : new Error(msg);
        if (error.fatal === false) return;

        cleanup();
        // A rejected login must not leave a socket reconnecting behind it.
        this.disconnect();
        reject(error);
      };

      this._loginReject = (error) => {
        cleanup();
        reject(error);
      };

      this.once("ready", onReady);
      this.on("error", onError);

      this.connect().catch((err) => {
        cleanup();
        reject(err);
      });
    });
  }

  /**
   * Connect to Discord WebSocket
   * @returns {Promise<void>}
   * @throws {Error} If no token is set
   */
  async connect() {
    if (!this.token) {
      throw new Error("Token is required. Call login() first.");
    }

    if (this.ws) {
      this.ws.disconnect();
    }

    this.ws = new DiscordWebSocket(this, this.token, this.options);
    this.ws.connect();
  }

  /**
   * Disconnect from Discord
   * @returns {void}
   */
  disconnect() {
    if (this._loginReject) {
      this._loginReject(new Error("Client disconnected before ready"));
    }
    if (this.ws) {
      this.ws.disconnect();
    }
  }

  /**
   * Send raw data to Discord WebSocket
   * @param {object} payload - The payload to send
   * @returns {void}
   */
  send(payload) {
    if (this.ws) {
      this.ws.send(payload);
    }
  }

  /**
   * Send a message to a channel
   * @param {string} channelId - The channel ID to send to
   * @param {string|object} content - Message content or payload
   * @param {object} [options] - Additional message options when content is a string or base object
   * @returns {Promise<Message|null>} The sent message object
   */
  async sendMessage(channelId, content, options) {
    let payload = content;
    if (options && typeof options === "object") {
      const base =
        typeof content === "string"
          ? { content }
          : content && typeof content === "object"
            ? { ...content }
            : {};
      payload = { ...base, ...options };
      if (payload.allowedMentions !== undefined) {
        if (payload.allowed_mentions === undefined) {
          payload.allowed_mentions = payload.allowedMentions;
        }
        delete payload.allowedMentions;
      }
    }
    const data = await this.rest.sendMessage(channelId, payload);
    return data ? new Message(this, data) : null;
  }

  /**
   * Create a DM channel with a user and cache it
   * @param {string} userId - The recipient user ID
   * @returns {Promise<Channel>} The DM channel instance
   */
  async createDM(userId) {
    const data = await this.rest.createDM(userId);
    const channel = new Channel(this, this.rest, data);
    this.channels.set(channel.id, channel);
    return channel;
  }

  /**
   * Get channel from cache
   * @param {string} id - The channel ID
   * @returns {Channel|null} The cached channel instance or null
   */
  getChannel(id) {
    return this.channels.get(id) || null;
  }

  /**
   * Resolve channel from cache or fetch from API
   * @param {string} id - The channel ID
   * @returns {Promise<Channel>} The resolved channel instance
   */
  async resolveChannel(id) {
    const cached = this.getChannel(id);
    if (cached) return cached;
    return await this.fetchChannel(id);
  }

  /**
   * Get guild from cache
   * @param {string} id - The guild ID
   * @returns {Guild|null} The cached guild instance or null
   */
  getGuild(id) {
    return this.guilds.get(id) || null;
  }

  /**
   * Resolve guild from cache or fetch from API
   * @param {string} id - The guild ID
   * @returns {Promise<Guild>} The resolved guild instance
   */
  async resolveGuild(id) {
    const cached = this.getGuild(id);
    if (cached) return cached;
    return await this.fetchGuild(id);
  }

  /**
   * Get user from cache
   * @param {string} id - The user ID
   * @returns {User|null} The cached user instance or null
   */
  getUser(id) {
    return this.users.get(id) || null;
  }

  /**
   * Resolve user from cache or fetch from API
   * @param {string} id - The user ID
   * @returns {Promise<User>} The resolved user instance
   */
  async resolveUser(id) {
    const cached = this.getUser(id);
    if (cached) return cached;
    return await this.fetchUser(id);
  }

  /**
   * Fetch guild data from API and update cache
   * @param {string} id - The guild ID
   * @returns {Promise<Guild>} The guild instance with fresh data
   */
  async fetchGuild(id) {
    const data = await this.rest.fetchGuild(id);
    const guild = new Guild(this, this.rest, data);
    this.guilds.set(id, guild); // Update cache with fresh data

    // Also fetch and cache the client's member information for this guild
    try {
      const memberData = await this.rest.fetchGuildMember(id);
      const memberId = memberData?.user?.id || this.user?.id;
      if (memberId) {
        const GuildMember = require("./GuildMember");
        const member = new GuildMember(this, memberData, guild);
        guild._members.set(memberId, member);
      }
    } catch (error) {
      // If fetching member fails, continue without it
      // This might happen if the bot doesn't have permission or other issues
      console.warn(
        `Failed to fetch member data for guild ${id}:`,
        error.message,
      );
    }

    return guild;
  }

  /**
   * Fetch user data from API and update cache
   * @param {string} id - The user ID
   * @returns {Promise<User>} The User instance with fresh data
   */
  async fetchUser(id) {
    const data = await this.rest.fetchUser(id);
    const user = new User(this, data);
    this.users.set(id, user);
    return user;
  }

  /**
   * Fetch channel data from API and update cache
   * @param {string} id - The channel ID
   * @returns {Promise<Channel>} The channel instance with fresh data
   */
  async fetchChannel(id) {
    const data = await this.rest.fetchChannel(id);
    const channel = new Channel(this, this.rest, data);
    this.channels.set(id, channel); // Update cache with fresh data
    return channel;
  }

  /**
   * Fetch a specific message from a channel
   * @param {string} channelId - The channel ID
   * @param {string} messageId - The message ID
   * @returns {Promise<Message>} The message instance
   */
  async fetchMessage(channelId, messageId) {
    const data = await this.rest.fetchMessage(channelId, messageId);
    return new Message(this, data);
  }

  /**
   * Fetch messages from a channel
   * @param {string} channelId - The channel ID
   * @param {object} [options={}] - Fetch options
   * @param {number} [options.limit] - Number of messages to fetch
   * @param {string} [options.before] - Fetch messages before this message ID
   * @param {string} [options.after] - Fetch messages after this message ID
   * @returns {Promise<Message[]>} Array of message instances
   */
  async fetchMessages(channelId, options = {}) {
    const data = await this.rest.fetchMessages(channelId, options);
    if (!Array.isArray(data)) return data;
    return data.map((msg) => new Message(this, msg));
  }

  /**
   * Get the user token
   * @returns {string|null} The user token
   */
  getToken() {
    return this.token;
  }

  /**
   * Get rate limit status for debugging
   * @param {string} endpoint - The API endpoint
   * @param {string} method - The HTTP method (default: 'GET')
   * @returns {object} Rate limit information
   */
  getRateLimitStatus(endpoint, method = "GET") {
    if (!this.rest) {
      throw new Error("Client is not logged in");
    }
    return this.rest.getRateLimitStatus(endpoint, method);
  }

  /**
   * Check if a route is currently rate limited
   * @param {string} endpoint - The API endpoint
   * @param {string} method - The HTTP method (default: 'GET')
   * @returns {boolean} True if rate limited
   */
  isRateLimited(endpoint, method = "GET") {
    if (!this.rest) {
      return false;
    }
    return this.rest.isRateLimited(endpoint, method);
  }

  /**
   * Destroy the client and clean up resources.
   *
   * Aborts in-flight REST requests, rejects queued requests, closes the
   * gateway connection, and removes event listeners.
   * @param {Error} [reason] - Error used to reject pending REST work
   * @returns {void}
   */
  destroy(reason) {
    const destroyError =
      reason instanceof Error ? reason : new RestManagerDestroyedError();
    try {
      this.rest?.destroy?.(destroyError);
    } finally {
      if (this._loginReject) {
        this._loginReject(destroyError);
      }
      for (const cancel of [...this._awaitCleanups]) {
        cancel(destroyError);
      }
      this.disconnect();
      this.removeAllListeners();
    }
  }
}

module.exports = Client;
