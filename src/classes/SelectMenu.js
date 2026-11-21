/**
 * Builds a select menu (component types 3, 5, 6, 7 and 8) for a message payload.
 *
 * Select menus must be placed inside an {@link ActionRow}.
 * @example
 * const { ActionRow, SelectMenu } = require("discord-self-lite");
 *
 * const row = new ActionRow(
 *   new SelectMenu()
 *     .setCustomId("color")
 *     .setPlaceholder("Pick a color")
 *     .addOption({ label: "Red", value: "red" })
 *     .addOption({ label: "Blue", value: "blue" }),
 * );
 *
 * await channel.send({ content: "Choose", components: [row] });
 */
class SelectMenu {
  /**
   * Create a select menu
   * @param {object} [options={}] - Initial select menu data
   * @param {number} [options.type=3] - Component type
   * @param {string} [options.customId] - Component custom ID
   * @param {string} [options.placeholder] - Placeholder text
   * @param {number} [options.minValues] - Minimum selected values
   * @param {number} [options.maxValues] - Maximum selected values
   * @param {boolean} [options.disabled=false] - Whether the menu is disabled
   * @param {object[]} [options.options] - Options for a string select menu
   * @param {number[]} [options.channelTypes] - Channel types for a channel menu
   * @param {object[]} [options.defaultValues] - Default selected values
   */
  constructor(options = {}) {
    this.type = SelectMenu.resolveType(options.type ?? SelectMenu.TYPES.STRING);
    this.customId = options.customId ?? options.custom_id ?? null;
    this.placeholder = options.placeholder ?? null;
    this.minValues = options.minValues ?? options.min_values ?? null;
    this.maxValues = options.maxValues ?? options.max_values ?? null;
    this.disabled = options.disabled ?? false;
    this.options = [];
    this.channelTypes = options.channelTypes ?? options.channel_types ?? null;
    this.defaultValues =
      options.defaultValues ?? options.default_values ?? null;

    if (options.options) this.setOptions(options.options);
  }

  /**
   * Resolve a numeric or named select menu type
   * @param {number|string} type - Component type or type name
   * @returns {number} Numeric component type
   */
  static resolveType(type) {
    if (typeof type === "string") {
      const resolved = SelectMenu.TYPES[type.toUpperCase()];
      if (resolved) return resolved;

      const numeric = Number(type);
      if (Number.isInteger(numeric)) return numeric;
    }
    return type;
  }

  /**
   * Set the component type
   * @param {number|string} type - Component type or type name
   * @returns {SelectMenu} This menu
   */
  setType(type) {
    this.type = SelectMenu.resolveType(type);
    return this;
  }

  /**
   * Set the custom ID
   * @param {string} customId - Component custom ID
   * @returns {SelectMenu} This menu
   */
  setCustomId(customId) {
    this.customId = customId;
    return this;
  }

  /**
   * Set the placeholder text
   * @param {string|null} placeholder - Placeholder text
   * @returns {SelectMenu} This menu
   */
  setPlaceholder(placeholder) {
    this.placeholder = placeholder;
    return this;
  }

  /**
   * Set the minimum number of selected values
   * @param {number} minValues - Minimum selected values
   * @returns {SelectMenu} This menu
   */
  setMinValues(minValues) {
    this.minValues = minValues;
    return this;
  }

  /**
   * Set the maximum number of selected values
   * @param {number} maxValues - Maximum selected values
   * @returns {SelectMenu} This menu
   */
  setMaxValues(maxValues) {
    this.maxValues = maxValues;
    return this;
  }

  /**
   * Enable or disable the menu
   * @param {boolean} [disabled=true] - Whether the menu is disabled
   * @returns {SelectMenu} This menu
   */
  setDisabled(disabled = true) {
    this.disabled = disabled;
    return this;
  }

  /**
   * Add one option to a string select menu
   * @param {object} option - Option data
   * @param {string} option.label - Option label
   * @param {string} option.value - Option value
   * @param {string} [option.description] - Option description
   * @param {object|string} [option.emoji] - Option emoji
   * @param {boolean} [option.default] - Whether the option is selected by default
   * @returns {SelectMenu} This menu
   */
  addOption(option) {
    this.options.push(option);
    return this;
  }

  /**
   * Add one or more options to a string select menu
   * @param {...(object|Array<object>)} options - Options or arrays of options
   * @returns {SelectMenu} This menu
   */
  addOptions(...options) {
    for (const option of options.flat()) {
      if (option) this.addOption(option);
    }
    return this;
  }

  /**
   * Replace the menu's options
   * @param {...(object|Array<object>)} options - Options or arrays of options
   * @returns {SelectMenu} This menu
   */
  setOptions(...options) {
    this.options = [];
    return this.addOptions(...options);
  }

  /**
   * Set the allowed channel types for a channel select menu
   * @param {...(number|Array<number>)} channelTypes - Channel type IDs
   * @returns {SelectMenu} This menu
   */
  setChannelTypes(...channelTypes) {
    this.channelTypes = channelTypes.flat();
    return this;
  }

  /**
   * Set the default selected values
   * @param {...(object|string|Array<object|string>)} values - Default values
   * @returns {SelectMenu} This menu
   */
  setDefaultValues(...values) {
    this.defaultValues = values.flat();
    return this;
  }

  /**
   * Serialize the menu for the Discord API
   * @returns {object} Raw select menu payload
   */
  toJSON() {
    const data = {
      type: this.type,
      custom_id: this.customId,
      disabled: this.disabled,
    };

    if (this.placeholder !== null) data.placeholder = this.placeholder;
    if (this.minValues !== null) data.min_values = this.minValues;
    if (this.maxValues !== null) data.max_values = this.maxValues;
    if (this.type === SelectMenu.TYPES.STRING) {
      data.options = this.options.map((option) => ({ ...option }));
    }
    if (
      this.type === SelectMenu.TYPES.CHANNEL &&
      Array.isArray(this.channelTypes)
    ) {
      data.channel_types = this.channelTypes;
    }
    if (
      this.type !== SelectMenu.TYPES.STRING &&
      Array.isArray(this.defaultValues)
    ) {
      data.default_values = this.defaultValues;
    }

    return data;
  }

  /**
   * Create a string select menu
   * @param {object} [options={}] - Initial select menu data
   * @returns {SelectMenu} The select menu
   */
  static string(options = {}) {
    return new SelectMenu({ ...options, type: SelectMenu.TYPES.STRING });
  }

  /**
   * Create a user select menu
   * @param {object} [options={}] - Initial select menu data
   * @returns {SelectMenu} The select menu
   */
  static user(options = {}) {
    return new SelectMenu({ ...options, type: SelectMenu.TYPES.USER });
  }

  /**
   * Create a role select menu
   * @param {object} [options={}] - Initial select menu data
   * @returns {SelectMenu} The select menu
   */
  static role(options = {}) {
    return new SelectMenu({ ...options, type: SelectMenu.TYPES.ROLE });
  }

  /**
   * Create a mentionable select menu
   * @param {object} [options={}] - Initial select menu data
   * @returns {SelectMenu} The select menu
   */
  static mentionable(options = {}) {
    return new SelectMenu({ ...options, type: SelectMenu.TYPES.MENTIONABLE });
  }

  /**
   * Create a channel select menu
   * @param {object} [options={}] - Initial select menu data
   * @returns {SelectMenu} The select menu
   */
  static channel(options = {}) {
    return new SelectMenu({ ...options, type: SelectMenu.TYPES.CHANNEL });
  }
}

/**
 * Discord select menu component types
 * @type {Readonly<object>}
 */
SelectMenu.TYPES = Object.freeze({
  STRING: 3,
  USER: 5,
  ROLE: 6,
  MENTIONABLE: 7,
  CHANNEL: 8,
});

module.exports = SelectMenu;
