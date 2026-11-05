# ActionRow Class

Builds an action row (component type `1`) for a message payload.

Action rows hold buttons and select menus. A select menu must be the only
component in its row.

## Constructor

```javascript
const { ActionRow, SelectMenu } = require("discord-self-lite");

const row = new ActionRow(
  new SelectMenu()
    .setCustomId("color")
    .addOption({ label: "Red", value: "red" }),
);
```

You can also pass an array of components, or add them later.

## Methods

### `addComponent(component)`

Adds one component builder or raw component object. Returns the row.

### `addComponents(...components)`

Adds multiple components. Each argument can be a component or an array of
components. Returns the row.

### `setComponents(...components)`

Replaces the row's components. Returns the row.

### `toJSON()`

Returns the raw action row payload:

```javascript
{
  type: 1,
  components: [/* ... */]
}
```

`JSON.stringify` calls `toJSON()` automatically, so rows can be passed directly
to `channel.send()`, `message.edit()`, or `webhook.send()`.

## Example

```javascript
const { ActionRow, SelectMenu } = require("discord-self-lite");

await channel.send({
  content: "Choose a color",
  components: [
    new ActionRow(
      new SelectMenu()
        .setCustomId("color")
        .setPlaceholder("Pick one")
        .addOption({ label: "Red", value: "red" })
        .addOption({ label: "Blue", value: "blue" }),
    ),
  ],
});
```

---

**Navigation:**

- [← Back to API Reference](README.md)
- [SelectMenu Class →](SelectMenu.md)
