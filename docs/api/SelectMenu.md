# SelectMenu Class

Builds a select menu (component types `3`, `5`, `6`, `7` and `8`) for a message
payload.

Select menus must be placed inside an [`ActionRow`](ActionRow.md).

## Types

`SelectMenu.TYPES` contains the supported component types:

| Key           | Value | Menu               |
| ------------- | ----- | ------------------ |
| `STRING`      | `3`   | String select      |
| `USER`        | `5`   | User select        |
| `ROLE`        | `6`   | Role select        |
| `MENTIONABLE` | `7`   | Mentionable select |
| `CHANNEL`     | `8`   | Channel select     |

## Constructor

```javascript
const { SelectMenu } = require("discord-self-lite");

const menu = new SelectMenu({
  type: SelectMenu.TYPES.STRING,
  customId: "color",
  placeholder: "Pick a color",
  options: [
    { label: "Red", value: "red" },
    { label: "Blue", value: "blue" },
  ],
});
```

The default type is `STRING`.

## Methods

| Method                        | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `setType(type)`               | Set the numeric type or a `TYPES` key        |
| `setCustomId(id)`             | Set the custom ID                            |
| `setPlaceholder(text)`        | Set the placeholder text                     |
| `setMinValues(number)`        | Set the minimum selected values              |
| `setMaxValues(number)`        | Set the maximum selected values              |
| `setDisabled(boolean)`        | Disable or enable the menu                   |
| `addOption(option)`           | Add one string option                        |
| `addOptions(...options)`      | Add one or more string options               |
| `setOptions(options)`         | Replace the string options                   |
| `setChannelTypes(...types)`   | Set allowed channel types for a channel menu |
| `setDefaultValues(...values)` | Set the default selected values              |
| `toJSON()`                    | Serialize the menu for the Discord API       |

All setters except `toJSON()` return the menu, so calls can be chained.

## Static Factories

- `SelectMenu.string(options)` - String select
- `SelectMenu.user(options)` - User select
- `SelectMenu.role(options)` - Role select
- `SelectMenu.mentionable(options)` - Mentionable select
- `SelectMenu.channel(options)` - Channel select

## Examples

### String select

```javascript
const { ActionRow, SelectMenu } = require("discord-self-lite");

const row = new ActionRow(
  new SelectMenu()
    .setCustomId("color")
    .addOption({ label: "Red", value: "red" })
    .addOption({ label: "Blue", value: "blue" }),
);
```

### User select

```javascript
const row = new ActionRow(
  SelectMenu.user({
    customId: "user",
    placeholder: "Pick a user",
    minValues: 1,
    maxValues: 1,
  }),
);
```

### Channel select

```javascript
const row = new ActionRow(
  SelectMenu.channel({
    customId: "channel",
    channelTypes: [0, 5], // text and announcement channels
  }),
);
```

## Receiving and using select menus

Incoming message components are available on `message.components`. Use
`message.selectMenu()` to submit a selection:

```javascript
client.on("messageCreate", async (message) => {
  if (message.components?.length) {
    await message.selectMenu("red");
  }
});
```

---

**Navigation:**

- [← Back to API Reference](README.md)
- [← ActionRow Class](ActionRow.md)
