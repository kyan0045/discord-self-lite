/**
 * Builds an action row (component type 1) for a message payload.
 *
 * Rows hold up to five components. A select menu must be the only component in
 * its row, while buttons can share a row.
 * @example
 * const { ActionRow, SelectMenu } = require("discord-self-lite");
 *
 * const row = new ActionRow(
 *   new SelectMenu().setCustomId("pick").addOption({
 *     label: "One",
 *     value: "one",
 *   }),
 * );
 *
 * await channel.send({ content: "Choose", components: [row] });
 */
class ActionRow {
  /**
   * Create an action row
   * @param {...(object|Array<object>)} components - Components to add
   */
  constructor(...components) {
    this.components = [];
    this.addComponents(...components);
  }

  /**
   * Add one component to the row
   * @param {object} component - A component builder or raw component object
   * @returns {ActionRow} This row
   */
  addComponent(component) {
    this.components.push(component);
    return this;
  }

  /**
   * Add several components to the row
   * @param {...(object|Array<object>)} components - Components or arrays of
   * components
   * @returns {ActionRow} This row
   */
  addComponents(...components) {
    for (const component of components.flat()) {
      if (component) this.addComponent(component);
    }
    return this;
  }

  /**
   * Replace the row's components
   * @param {...(object|Array<object>)} components - Components or arrays of
   * components
   * @returns {ActionRow} This row
   */
  setComponents(...components) {
    this.components = [];
    return this.addComponents(...components);
  }

  /**
   * Serialize the row for the Discord API
   * @returns {{type: number, components: object[]}} Raw action row payload
   */
  toJSON() {
    return {
      type: 1,
      components: this.components.map((component) =>
        typeof component.toJSON === "function" ? component.toJSON() : component,
      ),
    };
  }
}

module.exports = ActionRow;
