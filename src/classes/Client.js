const { EventEmitter } = require("events");
const DiscordWebSocket = require("../connection/ws/WebSocket");
const RestManager = require("../connection/rest/RestManager");
const Guild = require("./Guild");
const Channel = require("./Channel");
const Message = require("./Message");
const User = require("./User");

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
   * @param {object} [options.ws] - WebSocket connection options
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
      ws: {},
      ...options,
    };
    this.token = null;
    this.ws = null;
    this.rest = null;
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
    this.token = token;
    this.rest = new RestManager(this.token, this.options.apiVersion || 9);

    return new Promise((resolve, reject) => {
      const onReady = () => {
        this.removeListener("error", onError);
        resolve();
      };

      const onError = (msg) => {
        this.removeListener("ready", onReady);
        reject(new Error(msg));
      };

      this.once("ready", onReady);
      this.once("error", onError);

      this.connect().catch((err) => {
        this.removeListener("ready", onReady);
        this.removeListener("error", onError);
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

    this.ws = new DiscordWebSocket(this, this.token, this.options);
    this.ws.connect();
  }

  /**
   * Disconnect from Discord
   * @returns {void}
   */
  disconnect() {
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
   * @returns {Promise<Message>} The sent message object
   */
  async sendMessage(channelId, content) {
    const data = await this.rest.sendMessage(channelId, content);
    return new Message(this, data);
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
      const GuildMember = require("./GuildMember");
      const member = new GuildMember(this, memberData, guild);
      guild._members.set(this.user.id, member);
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
   * Destroy the client and clean up resources
   * @returns {void}
   */
  destroy() {
    this.disconnect();
    this.removeAllListeners();
  }
}

module.exports = Client;
