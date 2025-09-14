# Examples

This directory contains comprehensive examples demonstrating how to use the discord-self library.

## 📁 Files

- **`client-example.js`** - Complete example using the main Discord Client
- **`webhook-example.js`** - Complete example using the WebhookClient for webhook messaging

## 🚀 Client Example

The `client-example.js` demonstrates:

- **Basic Setup**: Login and connection handling
- **Event Handling**: Message creation, guild events, error handling
- **Message Interactions**: Sending replies, reactions, button clicking
- **Channel Operations**: Fetching channels, sending messages, getting channel info
- **Advanced Features**: Message history, guild information, graceful shutdown

### Key Features Shown:

```javascript
// Basic command responses
if (message.content === "!ping") {
  await message.reply("🏓 Pong!");
}

// Button interactions
if (message.components && message.components.length > 0) {
  await message.clickButton(0); // Click first button
}

// Channel information
const channel = await client.fetchChannel("CHANNEL_ID");
const messages = await channel.fetchMessages({ limit: 5 });
```

## 🔗 Webhook Example

The `webhook-example.js` demonstrates:

- **Simple Messages**: Basic text sending
- **Rich Embeds**: Creating beautiful Discord embeds
- **Message Management**: Editing, deleting, fetching messages
- **Utility Functions**: Status updates, error reports, notifications
- **Advanced Embeds**: Multiple embeds, complex formatting

### Key Features Shown:

```javascript
// Simple message
await webhook.send("Hello, world! 🌍");

// Rich embed
const embed = WebhookClient.createEmbed({
  title: "Example Embed",
  description: "This is an example embed",
  color: 0x00ff00,
  fields: [{ name: "Field 1", value: "Value 1", inline: true }],
});
await webhook.send(embed);

// Complex payload
await webhook.send({
  content: "Check this out!",
  embeds: [embed],
  username: "Custom Bot Name",
});
```

## 🛠️ Setup Instructions

### For Client Example:

1. **Get your Discord token:**
   - Open Discord in your browser
   - Press `F12` to open Developer Tools
   - Go to the `Network` tab
   - Refresh the page
   - Look for requests to `discord.com/api/v9/`
   - Find the `Authorization` header in any request
   - Copy the token

2. **Replace the token:**

   ```javascript
   client.login("YOUR_USER_TOKEN_HERE");
   ```

3. **Update IDs:**
   ```javascript
   // Replace with actual IDs
   const channel = await client.fetchChannel("CHANNEL_ID_HERE");
   const guild = await client.fetchGuild("GUILD_ID_HERE");
   ```

### For Webhook Example:

1. **Create a webhook:**
   - Go to your Discord server
   - Right-click on a channel → `Edit Channel`
   - Go to `Integrations` → `Webhooks` → `New Webhook`
   - Copy the webhook URL

2. **Replace the URL:**
   ```javascript
   const webhook = new WebhookClient(
     "https://discord.com/api/webhooks/YOUR_WEBHOOK_URL",
   );
   ```

## 🏃‍♂️ Running the Examples

```bash
# Client example
node examples/client-example.js

# Webhook example
node examples/webhook-example.js
```

## ⚠️ Important Notes

### Security:

- **Never share your Discord token** - treat it like a password
- **Use environment variables** for production:
  ```javascript
  client.login(process.env.DISCORD_TOKEN);
  ```

### Rate Limits:

- Discord has rate limits for both regular API and webhooks
- The examples include delays to avoid hitting limits
- For production use, keep possible limits in mind

### Selfbot Disclaimer:

- Using selfbots is against Discord's Terms of Service
- Use this library for educational purposes only
- Consider using Discord's official bot API for production applications

## 🎯 Common Use Cases

### Client Example Use Cases:

- **Automation**: Auto-reply to specific messages
- **Monitoring**: Track mentions or keywords
- **Button Interactions**: Automatically click buttons or select menu options
- **Data Collection**: Fetch message history or server information

### Webhook Example Use Cases:

- **Notifications**: Server status updates, alerts
- **Logging**: Error reports, audit logs
- **Integrations**: External service notifications
- **Monitoring**: Performance metrics, uptime reports

## 📚 Additional Resources

- **Discord API Documentation**: https://discord.com/developers/docs/
- **Discord User API Documentation**: https://docs.discord.food/intro (unofficial)
- **Library Documentation**:
- **Discord Developer Portal**: https://discord.com/developers/applications
