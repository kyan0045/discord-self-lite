# discord-self-lite Documentation

A lightweight Discord selfbot library for Node.js with minimal dependencies.

## 📚 Documentation

- **[Getting Started](getting-started.md)** - Installation and quick start guide
- **[API Reference](api/README.md)** - Complete API documentation
  - [Client](api/Client.md) - Main Discord client class
  - [Message](api/Message.md) - Message handling and interactions
  - [Channel](api/Channel.md) - Channel operations
  - [WebhookClient](api/WebhookClient.md) - Webhook messaging
- **[Examples](examples.md)** - Code examples and common use cases
- **[Changelog](CHANGELOG.md)** - Version history and changes

## ⚡ Quick Start

```javascript
const { Client } = require("discord-self-lite");

const client = new Client();

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

## 🔗 Webhook Usage

```javascript
const { WebhookClient } = require("discord-self-lite");

const webhook = new WebhookClient("YOUR_WEBHOOK_URL");
await webhook.send("Hello from webhook!");
```

## ⚠️ Important Notice

**Selfbots are against Discord's Terms of Service.** This library is for educational purposes only. Using selfbots can result in account termination. Use at your own risk.

## 📄 License

[GPL-3.0](../LICENSE)

---

**Navigation:**

- [← Back to Repository](../README.md)
- [Getting Started →](getting-started.md)
