/**
 * Represents a Discord channel
 */
const Permissions = require("./Permissions");

/**
 * Safe BigInt conversion
 * @param {*} value - Value to convert to BigInt
 * @returns {bigint} BigInt representation
 */
function toBigInt(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "string") return BigInt(value);
  if (typeof value === "number") return BigInt(value);
  return 0n;
}

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

  /**
   * Check permissions for a member in this channel
   * @param {GuildMember} member - The guild member to check permissions for
   * @returns {Permissions} Permissions bitfield for this member in this channel
   */
  permissionsFor(member) {
    if (!member?.permissions) return new Permissions(toBigInt(0));

    // Start with the member's base guild permissions
    let permissions = member.permissions.bitfield;

    // If member has administrator, they have all permissions
    if (member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
      return new Permissions(Permissions.ALL);
    }

    // Apply channel permission overwrites
    if (this.data.permission_overwrites) {
      const overwrites = this.data.permission_overwrites;

      // Role overwrites (deny takes precedence over allow)
      const memberRoles = member.roles || [];
      for (const overwrite of overwrites) {
        if (overwrite.type === 0) {
          // Role overwrite
          if (
            memberRoles.includes(overwrite.id) ||
            overwrite.id === this.data.guild_id
          ) {
            permissions &= ~toBigInt(overwrite.deny || 0);
            permissions |= toBigInt(overwrite.allow || 0);
          }
        }
      }

      // Member-specific overwrites (takes precedence over role overwrites)
      const memberOverwrite = overwrites.find(
        (ow) => ow.type === 1 && ow.id === member.id,
      );
      if (memberOverwrite) {
        permissions &= ~toBigInt(memberOverwrite.deny || 0);
        permissions |= toBigInt(memberOverwrite.allow || 0);
      }
    }

    return new Permissions(permissions);
  }

  /**
   * Wait for a message in this channel
   * @param {object} [options={}] - Options for awaiting messages
   * @param {Function} [options.filter] - Filter function for messages (must return true/false)
   * @param {number} [options.time=30000] - Timeout in milliseconds
   * @param {boolean} [options.errors=true] - Whether to reject on timeout
   * @returns {Promise<Message>} The matching message
   * @throws {Error} If timeout is reached and errors is true
   * @example
   * // Wait for any message
   * const msg = await channel.awaitMessage();
   *
   * // Wait for a message from specific user
   * const msg = await channel.awaitMessage({
   *   filter: (m) => m.author.id === '123456789',
   *   time: 60000
   * });
   *
   * // Wait for message with specific content patterns
   * const msg = await channel.awaitMessage({
   *   filter: (m) => m.author.id === userId &&
   *                  (m.content.includes('yes') || m.content.includes('confirm')),
   *   time: 30000
   * });
   */
  async awaitMessage(options = {}) {
    const { filter = () => true, time = 30000, errors = true } = options;

    return new Promise((resolve, reject) => {
      const listener = (message) => {
        if (message.channelId === this.id && filter(message)) {
          this.client.removeListener("messageCreate", listener);
          clearTimeout(timeout);
          resolve(message);
        }
      };

      const timeout = setTimeout(() => {
        this.client.removeListener("messageCreate", listener);
        if (errors) {
          reject(new Error("Message await timed out"));
        } else {
          resolve(null);
        }
      }, time);

      this.client.on("messageCreate", listener);
    });
  }
}

module.exports = Channel;
