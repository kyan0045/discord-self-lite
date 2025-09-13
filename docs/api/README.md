# API Reference

Complete API documentation for discord-self-lite.

## 📋 Classes

| Class                                 | Description                                              | Documentation                    |
| ------------------------------------- | -------------------------------------------------------- | -------------------------------- |
| **[Client](Client.md)**               | Main Discord client for connecting and handling events   | [📖 View Docs](Client.md)        |
| **[Message](Message.md)**             | Represents a Discord message with interaction methods    | [📖 View Docs](Message.md)       |
| **[Channel](Channel.md)**             | Represents a Discord channel with messaging capabilities | [📖 View Docs](Channel.md)       |
| **[WebhookClient](WebhookClient.md)** | Client for sending messages via Discord webhooks         | [📖 View Docs](WebhookClient.md) |

## 🚀 Quick Reference

### Client

```javascript
const client = new Client();
await client.login(token);
client.on("ready", (data) => {
  /* ready handler */
});
client.on("messageCreate", (message) => {
  /* message handler */
});
```

### Message

```javascript
await message.reply("Hello!");
await message.react("👍");
await message.clickButton(0); // Click first button
```

### Channel

```javascript
const channel = await client.fetchChannel("channel_id");
await channel.send("Hello channel!");
const messages = await channel.fetchMessages({ limit: 10 });
```

### WebhookClient

```javascript
const webhook = new WebhookClient("webhook_url");
await webhook.send("Hello from webhook!");
await webhook.send({ embeds: [embed] });
```

## 🔧 Core Concepts

### Events

The Client class extends EventEmitter and emits these events:

- `ready` - Client is connected and ready
- `messageCreate` - New message received
- `error` - Error occurred

### Authentication

- Uses Discord user tokens (selfbot approach)
- Connects via WebSocket to Discord Gateway
- REST API calls for message sending/interactions

### Rate Limiting

- Built-in basic rate limiting
- Respects Discord's API limits
- Handles 429 responses gracefully

### Button Interactions

- Click buttons by index: `message.clickButton(0)`
- Click buttons by custom ID: `message.clickButton('my_button')`
- Session-based approach (no interaction tokens needed)

## 📚 Detailed Documentation

Choose a class to view detailed documentation:

- **[Client Class →](Client.md)** - Connection, events, and main functionality
- **[Message Class →](Message.md)** - Message interactions and properties
- **[Channel Class →](Channel.md)** - Channel operations and messaging
- **[WebhookClient Class →](WebhookClient.md)** - Webhook messaging and embeds

---

**Navigation:**

- [← Back to Documentation](../README.md)
- [Getting Started](../getting-started.md)
- [Examples](../examples.md)
