const { EventEmitter } = require("events");
const DiscordWebSocket = require("../connection/ws/WebSocket");
const RestManager = require("../connection/rest/RestManager");
const Guild = require("./Guild");
const Channel = require("./Channel");
const Message = require("./Message");

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
    this.sessionId = null; // Will be set from WebSocket READY event
  }

  /**
   * Login to Discord with a user token
   * @param {string} token - The Discord user token
   * @returns {Promise<void>}
   */
  async login(token) {
    this.token = token;
    this.rest = new RestManager(this.token, this.options.apiVersion || 9);
    await this.connect();
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
   * @returns {Promise<object>} The sent message data
   */
  async sendMessage(channelId, content) {
    return await this.rest.sendMessage(channelId, content);
  }

  /**
   * Get channel from cache, or create empty instance if not cached
   * @param {string} id - The channel ID
   * @returns {Channel} The channel instance
   */
  getChannel(id) {
    if (!this.channels.has(id)) {
      this.channels.set(id, new Channel(this, this.rest, id));
    }
    return this.channels.get(id);
  }

  /**
   * Get guild from cache, or create empty instance if not cached
   * @param {string} id - The guild ID
   * @returns {Guild} The guild instance
   */
  getGuild(id) {
    if (!this.guilds.has(id)) {
      this.guilds.set(id, new Guild(this, this.rest, id));
    }
    return this.guilds.get(id);
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
    return guild;
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
   * @returns {Promise<Array>} Array of message data
   */
  async fetchMessages(channelId, options = {}) {
    return await this.rest.fetchMessages(channelId, options);
  }

  /**
   * Get the user token
   * @returns {string|null} The user token
   */
  getToken() {
    return this.token;
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
