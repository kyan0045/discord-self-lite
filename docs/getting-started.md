# Getting Started

This guide will help you get up and running with discord-self-lite.

## 📦 Installation

```bash
npm install discord-self-lite
```

## 🔧 Requirements

- **Node.js 18+** (uses built-in `fetch` API)
- **Discord user token** (for selfbot functionality)

## 🚀 Basic Setup

### 1. Import the Library

```javascript
const { Client, WebhookClient } = require("discord-self-lite");
```

### 2. Create a Client

```javascript
const client = new Client();
```

### 3. Login with Your Token

```javascript
client.login("YOUR_DISCORD_TOKEN");
```

## 📋 Getting Your Discord Token

⚠️ **Warning: Keep your token private! Never share it or commit it to version control.**

1. Open Discord in your web browser
2. Press `F12` to open Developer Tools
3. Go to the `Network` tab
4. Refresh the page or send a message
5. Look for requests to `discord.com/api/v9/`
6. Click on any request and find the `Authorization` header
7. Copy the token value

## 🎯 Basic Example

```javascript
const { Client } = require("discord-self-lite");

const client = new Client();

// Login
client.login("YOUR_TOKEN_HERE");

// Handle ready event
client.on("ready", (data) => {
  console.log(
    `🚀 Logged in as ${data.user.username}#${data.user.discriminator}`,
  );
  console.log(`📊 Connected to ${data.guilds.length} guilds`);
});

// Handle messages
client.on("messageCreate", async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Simple ping command
  if (message.content === "!ping") {
    await message.reply("🏓 Pong!");
  }

  // Echo command
  if (message.content.startsWith("!echo ")) {
    const text = message.content.slice(6);
    await message.reply(`📢 ${text}`);
  }

  // React to hello
  if (message.content.toLowerCase().includes("hello")) {
    await message.react("👋");
  }
});

// Handle errors
client.on("error", (error) => {
  console.error("❌ Client error:", error);
});
```

## 🪝 Webhook Example

```javascript
const { WebhookClient } = require("discord-self-lite");

// Create webhook client
const webhook = new WebhookClient("https://discord.com/api/webhooks/ID/TOKEN", {
  username: "My Bot",
  avatarURL: "https://example.com/avatar.png",
});

// Send a simple message
await webhook.send("Hello from webhook!");

// Send an embed
const embed = WebhookClient.createEmbed({
  title: "Test Embed",
  description: "This is a test embed",
  color: 0x00ff00,
  fields: [
    { name: "Field 1", value: "Value 1", inline: true },
    { name: "Field 2", value: "Value 2", inline: true },
  ],
});

await webhook.send("Check this out!", { embeds: [embed] });
```

## 🔧 Environment Variables

For production use, store your token in environment variables:

```javascript
// .env file
DISCORD_TOKEN = your_token_here;

// Your code
require("dotenv").config();
const client = new Client();
client.login(process.env.DISCORD_TOKEN);
```

## 🎮 Common Use Cases

### Auto-Reply Bot

```javascript
client.on("messageCreate", async (message) => {
  if (message.content === "!help") {
    await message.reply("Available commands: !ping, !echo, !time");
  }

  if (message.content === "!time") {
    await message.reply(`Current time: ${new Date().toLocaleString()}`);
  }
});
```

### Button Clicker

```javascript
client.on("messageCreate", async (message) => {
  // Click buttons automatically
  if (message.components && message.components.length > 0) {
    console.log("🔘 Found message with buttons");

    // Click first button
    await message.clickButton(0);

    // Or click by custom ID
    await message.clickButton("confirm_button");
  }
});
```

### Guild and Member Access

```javascript
client.on("ready", async (data) => {
  console.log(`Connected to ${data.guilds.length} guilds`);

  // Access the first guild
  const guild = client.guilds.get(data.guilds[0].id);

  // Get your member in this guild
  const myMember = guild.members.me;
  console.log(`My nickname: ${myMember.displayName}`);

  // Check permissions
  if (myMember.permissions.has("ADMINISTRATOR")) {
    console.log("I have admin permissions!");
  }

  // Fetch recent members
  const members = await guild.fetchMembers({ limit: 50 });
  console.log(`Fetched ${members.length} members`);
});
```

## 🔄 Next Steps

1. **[Read the API Reference](api/README.md)** - Learn about all available methods
2. **[Check Examples](examples.md)** - See more code examples
3. **[Explore Classes](api/Client.md)** - Understand the Client, Message, and Channel classes

## ⚠️ Important Notes

### Legal Notice

- **Selfbots violate Discord's Terms of Service**
- This library is for **educational purposes only**
- Using selfbots can result in **account termination**
- **Use at your own risk**

### Best Practices

- **Never share your token**
- **Use rate limiting** to avoid API limits
- **Handle errors gracefully**
- **Test in private servers first**
- **Consider using official Discord bots** for production

### Rate Limits

- Discord has strict rate limits
- The library handles basic rate limiting
- For heavy usage, implement additional delays
- Monitor for 429 (Too Many Requests) errors

---

**Navigation:**

- [← Back to Documentation](README.md)
- [API Reference →](api/README.md)
