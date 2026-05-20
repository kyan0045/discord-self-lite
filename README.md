# discord-self-lite

A lightweight Discord selfbot library for Node.js with minimal dependencies.

[![](https://img.shields.io/npm/v/discord-self-lite.svg)](https://www.npmjs.com/package/discord-self-lite)
[![](https://img.shields.io/npm/dm/discord-self-lite.svg)](https://www.npmjs.com/package/discord-self-lite)

## Installation

```bash
npm install discord-self-lite
```

## Quick Start

```javascript
const { Client } = require("discord-self-lite");

const client = new Client();

// Login with your user token
client.login("YOUR_TOKEN_HERE");

client.on("ready", (data) => {
  console.log(`Logged in as ${data.user.username}`);
});

client.on("messageCreate", async (message) => {
  if (message.content === "!ping") {
    await message.reply("Pong!");
  }
});
```

## Features

- ✅ WebSocket connection to Discord Gateway
- ✅ REST API integration
- ✅ Message sending and replying
- ✅ Message reactions
- ✅ Button clicking (with custom IDs or indices)
- ✅ Channel and message fetching
- ✅ **Webhook support** - Send messages to Discord webhooks
- ✅ Minimal dependencies (only `ws`)

## API Reference

The full API documentation is available in the [`docs/api/`](docs/api/README.md) directory. Here are the core classes:

- **[`Client`](docs/api/Client.md)** - Main entry point, connection manager, and cache storage.
- **[`User`](docs/api/User.md) & [`ClientUser`](docs/api/ClientUser.md)** - Represents Discord users and the logged-in selfbot.
- **[`Message`](docs/api/Message.md)** - Represents text messages, supports replying, reacting, and clicking buttons.
- **[`Channel`](docs/api/Channel.md)** - Represents Text, DM, or Voice channels to fetch or send messages.
- **[`Guild`](docs/api/Guild.md) & [`GuildMember`](docs/api/GuildMember.md)** - Represents Discord servers and their members.
- **[`WebhookClient`](docs/api/WebhookClient.md)** - Standalone client to send requests via webhooks.
- **[`Permissions`](docs/api/Permissions.md) & [`BitField`](docs/api/BitField.md)** - Utility classes for resolving and checking Discord permissions.

_Check the [Complete API Reference](docs/api/README.md) for full properties, methods, and examples of each._

## Examples

### Basic Bot

```javascript
const { Client } = require("discord-self-lite");

const client = new Client();

client.login("YOUR_TOKEN_HERE");

client.on("ready", (data) => {
  console.log(`Ready as ${data.user.username}`);
});

client.on("messageCreate", async (message) => {
  if (message.content.startsWith("!echo ")) {
    const text = message.content.slice(6);
    await message.reply(text);
  }
});
```

### Button Interaction

```javascript
client.on("messageCreate", async (message) => {
  if (message.components && message.components.length > 0) {
    // Click first button
    await message.clickButton();

    // Click button by index
    await message.clickButton(1);

    // Click button by custom ID
    await message.clickButton("confirm_button");
  }
});
```

### Fetching Messages

```javascript
const channel = await client.fetchChannel("CHANNEL_ID");
const messages = await channel.fetchMessages({ limit: 50 });

console.log(`Fetched ${messages.length} messages`);
```

### Webhook Usage

```javascript
const { WebhookClient } = require("discord-self-lite");

// Create webhook client
const webhook = new WebhookClient("YOUR_WEBHOOK_URL", {
  username: "My Bot",
  avatarURL: "https://example.com/avatar.png",
});

// Send simple message
await webhook.send("Hello from webhook!");

// Send with embed
const embed = WebhookClient.createEmbed({
  title: "Test Embed",
  description: "This is a test embed",
  color: 0x00ff00,
  fields: [
    { name: "Field 1", value: "Value 1", inline: true },
    { name: "Field 2", value: "Value 2", inline: true },
  ],
});

await webhook.send("Check out this embed!", { embeds: [embed] });

// Send object payload (new flexible way)
await webhook.send({
  content: "Multiple embeds!",
  embeds: [embed1, embed2],
  username: "Multi-Embed Bot",
});

// Send just embeds
await webhook.send({ embeds: [embed] });

// Send array of embeds
await webhook.send([embed1, embed2]);
```

## Important Notes

⚠️ **Selfbots are against Discord's Terms of Service**

This library is for educational purposes only. Using selfbots can result in account termination. Use at your own risk.

## License

[GPL3.0](./LICENSE)
