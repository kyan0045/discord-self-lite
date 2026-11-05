const User = require("./User");

function camelCaseKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map((item) => camelCaseKeys(item));
  } else if (obj !== null && typeof obj === "object") {
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );
      newObj[camelKey] = camelCaseKeys(value);
    }
    return newObj;
  }
  return obj;
}

const SELECT_MENU_TYPES = new Set([3, 5, 6, 7, 8]);

/**
 * Collect matching components from an action row array.
 * @param {object[]} components - Message components
 * @param {Function} predicate - Component filter
 * @returns {object[]} Matching components
 */
function collectComponents(components, predicate) {
  const matches = [];
  if (!Array.isArray(components)) return matches;

  for (const row of components) {
    if (!row || !Array.isArray(row.components)) continue;
    for (const component of row.components) {
      if (component && predicate(component)) matches.push(component);
    }
  }

  return matches;
}

/**
 * Normalize select menu values to the string IDs Discord expects.
 * @param {*} values - One value or an array of values
 * @returns {string[]} Normalized values
 */
function normalizeValues(values) {
  const list = Array.isArray(values) ? values : [values];

  return list
    .filter((value) => value !== undefined && value !== null)
    .map((value) =>
      value && typeof value === "object" ? (value.id ?? value.value) : value,
    )
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value));
}

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

    this.components = camelCaseKeys(this.components || []);
    this.attachments = this.attachments || [];
    this.embeds = camelCaseKeys(this.embeds || []);
    this.mentions = this.mentions || [];
    this.mentionRoles = this.mentionRoles || [];
    this.reactions = this.reactions || [];
    this.guildId =
      this.guildId || this.client.getChannel(this.channelId)?.guildId || null;
    this.url = `https://discord.com/channels/${this.guildId ? this.guildId : "@me"}/${this.channelId}/${this.id}`;
  }

  /**
   * Get the channel this message was sent in
   * @returns {Channel|null} The cached channel instance, or null if not cached
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

    this.components = camelCaseKeys(this.components || []);
    this.attachments = this.attachments || [];
    this.embeds = camelCaseKeys(this.embeds || []);
    this.mentions = this.mentions || [];
    this.mentionRoles = this.mentionRoles || [];
    this.reactions = this.reactions || [];

    return this;
  }

  /**
   * Delete this message
   * @returns {Promise<Message>} This message instance after deletion
   */
  async delete() {
    await this.client.rest.deleteMessage(this.channelId, this.id);
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
    const channel = await this.client.resolveChannel(this.channelId);
    const replyPayload =
      typeof payload === "string"
        ? { content: payload, message_reference: { message_id: this.id } }
        : { ...payload, message_reference: { message_id: this.id } };
    return await channel.send(replyPayload);
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
    const buttons = collectComponents(
      this.components,
      (component) => component.type === 2 && component.customId,
    );

    if (buttons.length === 0) {
      throw new Error("No buttons found in message");
    }

    // Handle different input types
    if (input === null) {
      // No input: click first button
      customId = buttons[0].customId;
    } else if (typeof input === "number") {
      // Integer input: click button at that index
      if (input < 0 || input >= buttons.length) {
        throw new Error(
          `Button index ${input} out of range. Message has ${
            buttons.length
          } button(s) (0-${buttons.length - 1})`,
        );
      }
      customId = buttons[input].customId;
    } else if (typeof input === "string") {
      // String input: use as customId directly
      customId = input;
    } else {
      throw new Error("Invalid input type. Expected null, number, or string.");
    }

    // Get required data for button interaction
    const applicationId = this.applicationId || this.author?.id;
    const messageFlags = this.flags || 0;

    if (!applicationId) {
      throw new Error(
        "Cannot determine application ID. The message has no application or author data.",
      );
    }

    if (!this.client.sessionId) {
      throw new Error(
        "No session ID available - client not properly connected (yet).",
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
   * Select one or more values on a select menu in this message.
   *
   * Values are matched against option values or labels for string select
   * menus. For user, role, mentionable and channel menus, pass IDs or objects
   * with an `id` property.
   * @param {string|string[]|object|object[]} values - Selected value(s)
   * @param {null|number|string} [menu=null] - Select menu to use (null for
   * first, number for index, string for custom ID)
   * @returns {Promise<object>} The interaction response
   * @throws {Error} If no select menu exists, the input is invalid, or the
   * selected values do not match the menu's bounds
   */
  async selectMenu(values, menu = null) {
    const menus = collectComponents(
      this.components,
      (component) =>
        SELECT_MENU_TYPES.has(component.type) && component.customId,
    );

    if (menus.length === 0) {
      throw new Error("No select menus found in message");
    }

    let target;
    if (menu === null || menu === undefined) {
      target = menus[0];
    } else if (typeof menu === "number") {
      if (!Number.isInteger(menu) || menu < 0 || menu >= menus.length) {
        throw new Error(
          `Select menu index ${menu} out of range. Message has ${
            menus.length
          } select menu(s) (0-${menus.length - 1})`,
        );
      }
      target = menus[menu];
    } else if (typeof menu === "string") {
      target = menus.find((component) => component.customId === menu);
      if (!target) {
        throw new Error(`No select menu found with custom ID "${menu}"`);
      }
    } else {
      throw new Error("Invalid menu input. Expected null, number, or string.");
    }

    if (target.disabled) {
      throw new Error(`Select menu "${target.customId}" is disabled`);
    }

    const normalizedValues = normalizeValues(values);
    const selectedValues = this._resolveSelectMenuValues(
      target,
      normalizedValues,
    );
    const minValues = target.minValues ?? 1;
    const maxValues = target.maxValues ?? 1;

    if (selectedValues.length < minValues) {
      throw new Error(
        `Select menu "${target.customId}" requires at least ${minValues} value(s), received ${selectedValues.length}`,
      );
    }

    if (selectedValues.length > maxValues) {
      throw new Error(
        `Select menu "${target.customId}" accepts at most ${maxValues} value(s), received ${selectedValues.length}`,
      );
    }

    const applicationId = this.applicationId || this.author?.id;
    const messageFlags = this.flags || 0;

    if (!applicationId) {
      throw new Error(
        "Cannot determine application ID. The message has no application or author data.",
      );
    }

    if (!this.client.sessionId) {
      throw new Error(
        "No session ID available - client not properly connected (yet).",
      );
    }

    return await this.client.rest.selectMenu(
      this.channelId,
      this.id,
      applicationId,
      this.guildId,
      target.customId,
      target.type,
      selectedValues,
      this.client.sessionId,
      messageFlags,
    );
  }

  /**
   * Resolve submitted values against a select menu's options.
   * @private
   * @param {object} menu - Select menu component
   * @param {string[]} values - Normalized input values
   * @returns {string[]} Values accepted by Discord
   */
  _resolveSelectMenuValues(menu, values) {
    if (menu.type !== 3) return values;

    const options = Array.isArray(menu.options) ? menu.options : [];
    return values.map((value) => {
      const option = options.find(
        (candidate) => candidate.value === value || candidate.label === value,
      );
      if (!option) {
        throw new Error(
          `Value "${value}" is not an option on select menu "${menu.customId}"`,
        );
      }
      return option.value;
    });
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
    const ref = this.data?.message_reference;
    if (!ref) return null;

    const messageId = ref.messageId || ref.message_id;
    const channelId = ref.channelId || ref.channel_id || this.channelId;
    if (!messageId || !channelId) return null;

    let channel;
    try {
      channel = await this.client.resolveChannel(channelId);
    } catch (error) {
      console.error(error);
      return null;
    }

    try {
      return await channel.fetchMessage(messageId);
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}

module.exports = Message;
