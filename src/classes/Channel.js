/**
 * Represents a Discord channel
 */
class Channel {
  /**
   * Create a new Channel instance
   * @param {Client} client - The Discord client
   * @param {RestManager} rest - The REST manager
   * @param {string|object} data - Channel ID or full channel data
   */
  constructor(client, rest, data) {
    this.client = client;
    this.rest = rest;

    if (typeof data === "string") {
      this.id = data;
      this.data = { id: data };
      this.name = null;
      this.type = null;
    } else {
      this.data = data;

      for (const [key, value] of Object.entries(data)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
          letter.toUpperCase(),
        );
        this[camelKey] = value;
      }

      this.id = this.id || data.id;
      this.name = this.name || data.name;
      this.type = this.type || data.type;
    }
  }

  /**
   * Send a message to this channel
   * @param {string|object} payload - Message content or payload object
   * @returns {Promise<object>} The sent message data
   */
  async send(payload) {
    return await this.rest.sendMessage(this.id, payload);
  }

  /**
   * Send a message to this channel (alias for send)
   * @param {string|object} payload - Message content or payload object
   * @returns {Promise<object>} The sent message data
   */
  async sendMessage(payload) {
    return await this.send(payload);
  }

  /**
   * Fetch messages from this channel
   * @param {object} [options={}] - Fetch options
   * @param {number} [options.limit] - Number of messages to fetch
   * @param {string} [options.before] - Fetch messages before this message ID
   * @param {string} [options.after] - Fetch messages after this message ID
   * @returns {Promise<Array>} Array of message data
   */
  async fetchMessages(options = {}) {
    return await this.rest.fetchMessages(this.id, options);
  }

  /**
   * Fetch a specific message from this channel
   * @param {string} messageId - The message ID to fetch
   * @returns {Promise<Message>} The message instance
   */
  async fetchMessage(messageId) {
    const data = await this.rest.fetchMessage(this.id, messageId);
    const Message = require("./Message");
    return new Message(this.client, data);
  }

  /**
   * Get the guild this channel belongs to
   * @returns {Guild|null} The guild instance or null if not a guild channel
   */
  getGuild() {
    const guildId = this.data.guild_id;
    if (!guildId) return null;
    return this.client.getGuild(guildId);
  }

  /**
   * Fetch the guild this channel belongs to
   * @returns {Promise<Guild|null>} The guild instance or null if not a guild channel
   */
  async fetchGuild() {
    const guildId = this.data.guild_id;
    if (!guildId) return null;
    return await this.client.fetchGuild(guildId);
  }

  /**
   * Check if this is a text channel
   * @returns {boolean} True if this is a text channel
   */
  isText() {
    return this.type === 0; // GUILD_TEXT
  }

  /**
   * Check if this is a voice channel
   * @returns {boolean} True if this is a voice channel
   */
  isVoice() {
    return this.type === 2; // GUILD_VOICE
  }

  /**
   * Check if this is a category channel
   * @returns {boolean} True if this is a category channel
   */
  isCategory() {
    return this.type === 4; // GUILD_CATEGORY
  }

  /**
   * Check if this is a DM channel
   * @returns {boolean} True if this is a DM channel
   */
  isDM() {
    return this.type === 1; // DM
  }

  /**
   * Check if this is a group DM channel
   * @returns {boolean} True if this is a group DM channel
   */
  isGroupDM() {
    return this.type === 3; // GROUP_DM
  }

  /**
   * Check if this is a thread channel
   * @returns {boolean} True if this is a thread channel
   */
  isThread() {
    return this.type === 10 || this.type === 11 || this.type === 12; // Thread types
  }

  /**
   * Get the channel's mention string
   * @returns {string} The channel mention string
   */
  toString() {
    return `<#${this.id}>`;
  }

  /**
   * Get the channel's URL
   * @returns {string} The Discord URL for this channel
   */
  getURL() {
    if (this.isDM() || this.isGroupDM()) {
      return `https://discord.com/channels/@me/${this.id}`;
    }
    const guildId = this.data.guild_id;
    return `https://discord.com/channels/${guildId}/${this.id}`;
  }
}

module.exports = Channel;
