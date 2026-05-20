/**
 * Represents a Discord user
 */
class User {
  /**
   * Create a new User instance
   * @param {Client} client - The Discord client
   * @param {object} data - Raw user data from Discord API
   */
  constructor(client, data) {
    this.client = client;
    this.data = data;
    this._dmChannelId = null;

    // Copy all user properties
    for (const [key, value] of Object.entries(data)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );
      this[camelKey] = value;
    }
  }
  /**
   * Create a DM channel with this user
   * @returns {Promise<Channel>} The DM channel instance
   */
  async createDM() {
    const data = await this.client.rest.createDM(this.id);
    const Channel = require("./Channel");
    const channel = new Channel(this.client, this.client.rest, data);
    this.client.channels.set(channel.id, channel);
    this._dmChannelId = channel.id;
    return channel;
  }

  /**
   * Get existing DM channel or create one if needed
   * @returns {Promise<Channel>} The DM channel instance
   */
  async getDMChannel() {
    if (this._dmChannelId && this.client.channels.has(this._dmChannelId)) {
      return this.client.channels.get(this._dmChannelId);
    }

    return await this.createDM();
  }

  /**
   * Send a DM to this user
   * @param {string|object} payload - Message content or payload object
   * @returns {Promise<Message>} The sent message
   */
  async send(payload) {
    const dmChannel = await this.getDMChannel();
    return await dmChannel.send(payload);
  }
}

module.exports = User;
