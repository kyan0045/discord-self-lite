# discord-self-lite

A lightweight Discord selfbot library for Node.js with minimal dependencies.

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

### Client

```javascript
const { Client } = require("discord-self-lite");
const client = new Client();
```

#### Methods

- `client.login(token)` - Login with user token
- `client.getChannel(channelId)` - Get cached channel
- `client.fetchChannel(channelId)` - Fetch channel from API
- `client.fetchMessage(channelId, messageId)` - Fetch specific message

#### Events

- `ready` - Fired when client is ready
- `messageCreate` - Fired when a message is created

### Message

#### Methods

- `message.reply(content, options)` - Reply to the message
- `message.react(emoji)` - React to the message
- `message.clickButton(identifier)` - Click a button on the message
  - `identifier` can be:
    - `null` or omitted: clicks first button
    - `number`: clicks button at index (0-based)
    - `string`: clicks button with custom ID

#### Properties

- `message.content` - Message content
- `message.author` - Message author
- `message.channel` - Message channel
- `message.components` - Message components (buttons, etc.)

### Channel

#### Methods

- `channel.send(content, options)` - Send a message to the channel
- `channel.fetchMessages(options)` - Fetch messages from the channel

#### Properties

- `channel.id` - Channel ID
- `channel.name` - Channel name
- `channel.type` - Channel type

### WebhookClient

Send messages to Discord webhooks with support for embeds and more.

```javascript
const { WebhookClient } = require("discord-self-lite");
const webhook = new WebhookClient("YOUR_WEBHOOK_URL", {
  username: "My Bot",
  avatarURL: "https://example.com/avatar.png",
});
```

#### Constructor

- `new WebhookClient(url, options)` - Create a webhook client
  - `url` - Discord webhook URL
  - `options.username` - Default username for messages
  - `options.avatarURL` - Default avatar URL for messages

#### Methods

- `webhook.send(content, options)` - Send a message (supports text, embeds, and objects)
- `webhook.edit(messageId, content, options)` - Edit a message
- `webhook.delete(messageId)` - Delete a message
- `webhook.fetchMessage(messageId)` - Fetch a message

#### Static Methods

- `WebhookClient.createEmbed(data)` - Create an embed object
- `WebhookClient.parseURL(url)` - Parse webhook URL to get ID and token

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
