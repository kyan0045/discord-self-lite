const WebSocketError = require("./WebSocketError");

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
}

module.exports = Message;
