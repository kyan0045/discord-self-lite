const Channel = require("./Channel");
const GuildMember = require("./GuildMember");
const DiscordAPIError = require("./DiscordAPIError");

/**
 * Represents a Discord guild (server)
 */
class Guild {
  /**
   * Create a new Guild instance
   * @param {Client} client - The Discord client
   * @param {RestManager} rest - The REST manager
   * @param {string|object} data - Guild ID or full guild data
   */
  constructor(client, rest, data) {
    this.client = client;
    this.rest = rest;

    if (typeof data === "string") {
      this.id = data;
      this.data = { id: data };
      this.name = null;
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
    }

    // Cache for guild members
    this._members = new Map();
  }

  /**
   * Get a channel from this guild (from cache)
   * @param {string} channelId - The channel ID
   * @returns {Channel} The channel instance
   */
  getChannel(channelId) {
    const channel = this.client.getChannel(channelId);
    return channel;
  }

  /**
   * Fetch a channel and verify it belongs to this guild
   * @param {string} channelId - The channel ID
   * @returns {Promise<Channel>} The channel instance
   * @throws {Error} If the channel doesn't belong to this guild
   */
  async fetchChannel(channelId) {
    const channel = await this.client.fetchChannel(channelId);
    if (channel.data.guild_id && channel.data.guild_id !== this.id) {
      throw new Error(
        `Channel ${channelId} does not belong to guild ${this.id}`,
      );
    }
    return channel;
  }

  /**
   * Get all cached channels that belong to this guild
   * @returns {Array<Channel>} Array of channel instances
   */
  getChannels() {
    const channels = [];
    for (const [, channel] of this.client.channels) {
      if (channel.data.guild_id === this.id) {
        channels.push(channel);
      }
    }
    return channels;
  }

  /**
   * Fetch all channels for this guild from the API
   * @returns {Promise<Array<Channel>>} Array of channel instances
   */
  async fetchChannels() {
    const data = await this.rest.fetchChannels(this.id);
    const channels = [];
    for (const channelData of data) {
      // Create channel with full data and cache it
      const channel = new Channel(this.client, this.rest, channelData);
      this.client.channels.set(channelData.id, channel);
      channels.push(channel);
    }
    return channels;
  }

  /**
   * Get the guild's icon URL
   * @param {object} [options={}] - Icon options
   * @param {number} [options.size=512] - Icon size
   * @param {string} [options.format='png'] - Icon format (png, jpg, webp, gif)
   * @returns {string|null} The icon URL or null if no icon
   */
  getIconURL(options = {}) {
    if (!this.data.icon) return null;
    const size = options.size || 512;
    const format = options.format || "png";
    return `https://cdn.discordapp.com/icons/${this.id}/${this.data.icon}.${format}?size=${size}`;
  }

  /**
   * Get the guild's banner URL
   * @param {object} [options={}] - Banner options
   * @param {number} [options.size=512] - Banner size
   * @param {string} [options.format='png'] - Banner format (png, jpg, webp, gif)
   * @returns {string|null} The banner URL or null if no banner
   */
  getBannerURL(options = {}) {
    if (!this.data.banner) return null;
    const size = options.size || 512;
    const format = options.format || "png";
    return `https://cdn.discordapp.com/banners/${this.id}/${this.data.banner}.${format}?size=${size}`;
  }

  /**
   * Fetch members for this guild
   * @param {object} [options={}] - Fetch options
   * @param {number} [options.limit=1000] - Number of members to fetch
   * @param {string} [options.after] - Member ID to fetch after
   * @returns {Promise<Array<GuildMember>>} Array of guild member instances
   */
  async fetchMembers(options = {}) {
    const { limit = 1000 } = options;

    try {
      const membersData = await this.client.rest.fetchGuildMembers(this.id, {
        limit,
      });

      const members = [];
      for (const memberData of membersData) {
        const member = new GuildMember(this.client, memberData, this);
        this._members.set(member.user.id, member);
        members.push(member);
      }

      return members;
    } catch (error) {
      throw new DiscordAPIError(
        `Failed to fetch guild members: ${error.message}`,
      );
    }
  }

  /**
   * Get the members collection with a 'me' property
   * @returns {object} Members collection with Map methods and 'me' property
   */
  get members() {
    const membersMap = this._members;
    const client = this.client;

    return {
      // Map methods
      get: (key) => membersMap.get(key),
      set: (key, value) => membersMap.set(key, value),
      has: (key) => membersMap.has(key),
      delete: (key) => membersMap.delete(key),
      clear: () => membersMap.clear(),
      size: membersMap.size,
      [Symbol.iterator]: () => membersMap[Symbol.iterator](),

      // Special 'me' property
      get me() {
        return membersMap.get(client.user?.id);
      },
    };
  }

  /**
   * Set the members cache
   * @param {Map} value - The members map
   */
  set members(value) {
    this._members = value;
  }
}

module.exports = Guild;
