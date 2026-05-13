const WebSocketError = require("./WebSocketError");
const User = require("./User");

/**
 * Represents a Discord message
 */
class Message {
  /**
   * Create a new Message instance
   * @param {Client} client - The Discord client
   * @param {object} data - Raw message data from Discord API
   */
  constructor(client, data) {
    this.client = client;
    this.data = data;

    for (const [key, value] of Object.entries(data)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );
      this[camelKey] = value;
    }

    // Wrap author as User instance and cache it
    if (this.author && typeof this.author === "object") {
      const authorId = this.author.id;
      if (!this.client.users.has(authorId)) {
        this.author = new User(this.client, this.author);
        this.client.users.set(authorId, this.author);
      } else {
        this.author = this.client.users.get(authorId);
      }
    }

    this.components = this.components || [];
    this.attachments = this.attachments || [];
    this.embeds = this.embeds || [];
    this.mentions = this.mentions || [];
    this.mentionRoles = this.mentionRoles || [];
    this.reactions = this.reactions || [];
  }

  /**
   * Get the channel this message was sent in
   * @returns {Channel} The channel instance
   */
  get channel() {
    return this.client.getChannel(this.channelId);
  }

  async edit(payload) {
    const updatedData = await this.client.rest.editMessage(
      this.channelId,
      this.id,
      payload,
    );

    // Update internal raw data
    this.data = updatedData;

    for (const [key, value] of Object.entries(updatedData)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );
      this[camelKey] = value;
    }

    this.components = this.components || [];
    this.attachments = this.attachments || [];
    this.embeds = this.embeds || [];
    this.mentions = this.mentions || [];
    this.mentionRoles = this.mentionRoles || [];
    this.reactions = this.reactions || [];

    return this;
  }

  /**
   * Get the guild this message was sent in
   * @returns {Guild|null} The guild instance, or null if message was sent in DM
   */
  get guild() {
    return this.guildId ? this.client.getGuild(this.guildId) : null;
  }

  /**
   * Reply to this message
   * @param {string|object} payload - Message content or payload object
   * @returns {Promise<object>} The sent reply message data
   */
  async reply(payload) {
    const replyPayload =
      typeof payload === "string"
        ? { content: payload, message_reference: { message_id: this.id } }
        : { ...payload, message_reference: { message_id: this.id } };
    return await this.channel.send(replyPayload);
  }

  /**
   * React to this message
   * @param {string} emoji - The emoji to react with
   * @returns {Promise<void>}
   */
  async react(emoji) {
    return await this.client.rest.react(this.channelId, this.id, emoji);
  }

  /**
   * Click a button on this message
   * @param {null|number|string} [input=null] - Button to click (null for first, number for index, string for custom ID)
   * @returns {Promise<void>}
   * @throws {Error} If no buttons found or invalid input
   */
  async clickButton(input = null) {
    let customId = null;

    // Get all buttons from components
    const buttons = [];
    if (this.data.components && Array.isArray(this.data.components)) {
      for (const row of this.data.components) {
        if (row.components && Array.isArray(row.components)) {
          for (const component of row.components) {
            if (component.type === 2 && component.custom_id) {
              // Type 2 is button
              buttons.push(component);
            }
          }
        }
      }
    }

    if (buttons.length === 0) {
      throw new Error("No buttons found in message");
    }

    // Handle different input types
    if (input === null) {
      // No input: click first button
      customId = buttons[0].custom_id;
    } else if (typeof input === "number") {
      // Integer input: click button at that index
      if (input < 0 || input >= buttons.length) {
        throw new Error(
          `Button index ${input} out of range. Message has ${
            buttons.length
          } button(s) (0-${buttons.length - 1})`,
        );
      }
      customId = buttons[input].custom_id;
    } else if (typeof input === "string") {
      // String input: use as custom_id directly (preserving original behavior)
      customId = input;
    } else {
      throw new Error("Invalid input type. Expected null, number, or string.");
    }

    // Get required data for button interaction
    const applicationId = this.data.application_id || this.author.id;
    const messageFlags = this.data.flags || 0;

    if (!this.client.sessionId) {
      throw new WebSocketError(
        "No session ID available - client not properly connected",
      );
    }

    return await this.client.rest.clickButton(
      this.channelId,
      this.id,
      applicationId,
      this.guildId,
      customId,
      this.client.sessionId,
      messageFlags,
    );
  }

  /**
   * Backwards-compatible alias for message reference data
   */

  get reference() {
    // If the referenced message is embedded in the payload, return a Message instance.
    const embedded =
      this.data?.referenced_message || this.referencedMessage || null;
    if (embedded && typeof embedded === "object") {
      return new Message(this.client, embedded);
    }

    // Otherwise, no embedded message is available synchronously.
    return null;
  }

  /**
   * Fetch the referenced message asynchronously when only IDs are present.
   * Returns the referenced `Message` instance or `null` if not available.
   */
  async fetchReference() {
    const ref = this.messageReference || this.data?.message_reference;
    if (!ref) return null;

    const messageId = ref.messageId || ref.message_id;
    const channelId = ref.channelId || ref.channel_id || this.channelId;
    if (!messageId || !channelId) return null;

    // Try to get channel from cache or fetch from API
    let channel = this.client.getChannel(channelId);
    if (!channel) {
      try {
        channel = await this.client.fetchChannel(channelId);
      } catch {
        return null;
      }
    }

    try {
      return await channel.fetchMessage(messageId);
    } catch {
      return null;
    }
  }
}

module.exports = Message;
