# WebhookClient Class

Client for sending messages to Discord webhooks with support for embeds and flexible message formatting.

## Constructor

### `new WebhookClient(url, options)`

Creates a new webhook client instance.

**Parameters:**

- `url` (string) - Discord webhook URL
- `options` (object, optional) - Default options for all messages
  - `username` (string) - Default username for messages
  - `avatarURL` (string) - Default avatar URL for messages

**Examples:**

```javascript
// Basic webhook client
const webhook = new WebhookClient("https://discord.com/api/webhooks/ID/TOKEN");

// Webhook with default settings
const webhook = new WebhookClient("https://discord.com/api/webhooks/ID/TOKEN", {
  username: "My Bot",
  avatarURL: "https://example.com/avatar.png",
});
```

## Methods

### `send(content, options)`

Sends a message through the webhook. Supports multiple input formats for maximum flexibility.

**Parameters:**

- `content` (string|object|Array) - Message content in various formats
- `options` (object, optional) - Additional options (when content is string)

**Returns:** Promise<object> - Discord message object

**Input Formats:**

```javascript
// 1. Simple string
await webhook.send("Hello, world!");

// 2. String with options
await webhook.send("Hello!", {
  username: "Custom Name",
  avatarURL: "https://example.com/avatar.png",
  embeds: [embed],
});

// 3. Single embed object
await webhook.send({
  title: "Embed Title",
  description: "Embed description",
  color: 0x00ff00,
});

// 4. Array of embeds
await webhook.send([embed1, embed2, embed3]);

// 5. Complete payload object
await webhook.send({
  content: "Message with embeds",
  embeds: [embed1, embed2],
  username: "Custom Bot",
  avatarURL: "https://example.com/avatar.png",
});
```

**Options:**

- `username` (string) - Override default username
- `avatarURL` (string) - Override default avatar
- `embeds` (Array) - Array of embed objects
- `tts` (boolean) - Text-to-speech message
- `allowedMentions` (object) - Mention permissions
- `threadId` (string) - Thread ID to send message in

### `edit(messageId, content, options)`

Edits a previously sent webhook message.

**Parameters:**

- `messageId` (string) - ID of the message to edit
- `content` (string|object) - New message content
- `options` (object, optional) - Additional options

**Returns:** Promise<object> - Updated message object

**Examples:**

```javascript
// Edit message content
await webhook.edit("123456789012345678", "Updated message!");

// Edit with new embed
await webhook.edit("123456789012345678", {
  content: "Updated content",
  embeds: [newEmbed],
});
```

### `delete(messageId)`

Deletes a webhook message.

**Parameters:**

- `messageId` (string) - ID of the message to delete

**Returns:** Promise<boolean> - True if successful

**Example:**

```javascript
await webhook.delete("123456789012345678");
```

### `fetchMessage(messageId)`

Fetches a webhook message.

**Parameters:**

- `messageId` (string) - ID of the message to fetch

**Returns:** Promise<object> - Message object

**Example:**

```javascript
const message = await webhook.fetchMessage("123456789012345678");
console.log(`Message content: ${message.content}`);
```

## Static Methods

### `WebhookClient.createEmbed(data)`

Helper method to create embed objects with proper formatting.

**Parameters:**

- `data` (object) - Embed data
  - `title` (string) - Embed title
  - `description` (string) - Embed description
  - `url` (string) - Title URL
  - `color` (number) - Embed color (hex)
  - `timestamp` (string) - ISO timestamp
  - `footer` (object) - Footer data
    - `text` (string) - Footer text
    - `iconURL` (string) - Footer icon URL
  - `image` (string) - Large image URL
  - `thumbnail` (string) - Thumbnail image URL
  - `author` (object) - Author data
    - `name` (string) - Author name
    - `url` (string) - Author URL
    - `iconURL` (string) - Author icon URL
  - `fields` (Array) - Array of field objects
    - `name` (string) - Field name
    - `value` (string) - Field value
    - `inline` (boolean) - Whether field is inline

**Returns:** object - Formatted embed object

**Example:**

```javascript
const embed = WebhookClient.createEmbed({
  title: "Example Embed",
  description: "This is an example embed",
  color: 0x00ff00,
  timestamp: new Date().toISOString(),
  footer: { text: "Footer text", iconURL: "https://example.com/icon.png" },
  author: { name: "Author Name", iconURL: "https://example.com/author.png" },
  fields: [
    { name: "Field 1", value: "Value 1", inline: true },
    { name: "Field 2", value: "Value 2", inline: true },
  ],
});
```

### `WebhookClient.parseURL(url)`

Parses a webhook URL to extract ID and token.

**Parameters:**

- `url` (string) - Discord webhook URL

**Returns:** object - Parsed webhook data

- `id` (string) - Webhook ID
- `token` (string) - Webhook token

**Example:**

```javascript
const parsed = WebhookClient.parseURL(
  "https://discord.com/api/webhooks/123456789/abcdef123456",
);
console.log(`ID: ${parsed.id}, Token: ${parsed.token}`);
```

## Examples

### Basic Usage

```javascript
const { WebhookClient } = require("discord-self-lite");

// Create webhook client
const webhook = new WebhookClient("YOUR_WEBHOOK_URL", {
  username: "Status Bot",
  avatarURL: "https://example.com/bot-avatar.png",
});

// Send simple message
await webhook.send("🚀 System startup complete!");

// Send with custom settings
await webhook.send("🔧 Maintenance mode enabled", {
  username: "Maintenance Bot",
  avatarURL: "https://example.com/maintenance-icon.png",
});
```

### Rich Embeds

```javascript
// Create a rich embed
const statusEmbed = WebhookClient.createEmbed({
  title: "📊 System Status",
  description: "Current system status and metrics",
  color: 0x00ff00,
  timestamp: new Date().toISOString(),
  thumbnail: "https://example.com/status-icon.png",
  fields: [
    { name: "🖥️ CPU Usage", value: "45%", inline: true },
    { name: "💾 Memory", value: "2.1GB / 8GB", inline: true },
    { name: "💿 Disk Space", value: "156GB / 500GB", inline: true },
    { name: "🌐 Network", value: "↗️ 125 Mbps ↘️ 80 Mbps", inline: false },
    { name: "⏱️ Uptime", value: "7 days, 14 hours", inline: true },
    { name: "🔄 Last Restart", value: "<t:1694649600:R>", inline: true },
  ],
  footer: { text: "Last updated", iconURL: "https://example.com/clock.png" },
});

await webhook.send(statusEmbed);
```

### Error Reporting

````javascript
async function reportError(error) {
  const errorEmbed = WebhookClient.createEmbed({
    title: "❌ Error Report",
    description: "```\n" + error.stack + "\n```",
    color: 0xff0000,
    timestamp: new Date().toISOString(),
    fields: [
      { name: "Error Type", value: error.name, inline: true },
      { name: "Error Message", value: error.message, inline: true },
      { name: "Timestamp", value: new Date().toLocaleString(), inline: true },
    ],
    footer: { text: "Error Monitoring System" },
  });

  await webhook.send("🚨 **Critical Error Detected**", {
    embeds: [errorEmbed],
    username: "Error Monitor",
    avatarURL: "https://example.com/error-icon.png",
  });
}

// Usage
try {
  // Some code that might throw an error
  throw new Error("Database connection failed");
} catch (error) {
  await reportError(error);
}
````

### Notification System

```javascript
class NotificationSystem {
  constructor(webhookURL) {
    this.webhook = new WebhookClient(webhookURL, {
      username: "Notification System",
      avatarURL: "https://example.com/notification-icon.png",
    });
  }

  async info(title, message) {
    await this.webhook.send({
      embeds: [
        WebhookClient.createEmbed({
          title: `ℹ️ ${title}`,
          description: message,
          color: 0x3498db,
          timestamp: new Date().toISOString(),
        }),
      ],
    });
  }

  async success(title, message) {
    await this.webhook.send({
      embeds: [
        WebhookClient.createEmbed({
          title: `✅ ${title}`,
          description: message,
          color: 0x2ecc71,
          timestamp: new Date().toISOString(),
        }),
      ],
    });
  }

  async warning(title, message) {
    await this.webhook.send({
      embeds: [
        WebhookClient.createEmbed({
          title: `⚠️ ${title}`,
          description: message,
          color: 0xf39c12,
          timestamp: new Date().toISOString(),
        }),
      ],
    });
  }

  async error(title, message) {
    await this.webhook.send({
      embeds: [
        WebhookClient.createEmbed({
          title: `❌ ${title}`,
          description: message,
          color: 0xe74c3c,
          timestamp: new Date().toISOString(),
        }),
      ],
    });
  }
}

// Usage
const notifications = new NotificationSystem("YOUR_WEBHOOK_URL");

await notifications.info(
  "System Update",
  "System will be updated in 30 minutes",
);
await notifications.success(
  "Deployment Complete",
  "Version 2.1.0 deployed successfully",
);
await notifications.warning("High Memory Usage", "Memory usage is above 80%");
await notifications.error(
  "Service Down",
  "Payment service is currently unavailable",
);
```

### Message Management

```javascript
async function manageWebhookMessages() {
  // Send initial message
  const message1 = await webhook.send("🔄 Processing request...");
  console.log(`Sent message: ${message1.id}`);

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Update the message
  await webhook.edit(message1.id, "✅ Request processed successfully!");

  // Send another message
  const message2 = await webhook.send("📊 Generating report...");

  // Simulate more processing
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Update with embed
  await webhook.edit(message2.id, {
    content: "📈 Report Generated",
    embeds: [
      WebhookClient.createEmbed({
        title: "Processing Report",
        description: "Task completed successfully",
        color: 0x00ff00,
        fields: [
          { name: "Duration", value: "5 seconds", inline: true },
          { name: "Status", value: "Complete", inline: true },
        ],
      }),
    ],
  });

  // Clean up after some time
  setTimeout(async () => {
    await webhook.delete(message1.id);
    await webhook.delete(message2.id);
    console.log("Cleaned up temporary messages");
  }, 10000);
}

await manageWebhookMessages();
```

### Flexible Message Formats

```javascript
// All these work with the same send() method:

// 1. Simple text
await webhook.send("Hello, world!");

// 2. Text with options
await webhook.send("Important message!", {
  username: "Alert Bot",
  tts: true,
});

// 3. Just an embed
await webhook.send({
  title: "Announcement",
  description: "Server maintenance tonight",
  color: 0xffaa00,
});

// 4. Multiple embeds
await webhook.send([
  { title: "Embed 1", color: 0xff0000 },
  { title: "Embed 2", color: 0x00ff00 },
  { title: "Embed 3", color: 0x0000ff },
]);

// 5. Complex payload
await webhook.send({
  content: "🎉 **Special Announcement**",
  embeds: [
    WebhookClient.createEmbed({
      title: "New Feature Released!",
      description: "Check out our latest update",
      color: 0x5865f2,
      image: "https://example.com/feature-preview.png",
    }),
  ],
  username: "Feature Bot",
  avatarURL: "https://example.com/feature-icon.png",
});
```

### URL Parsing Utility

```javascript
// Parse webhook URL
try {
  const webhookData = WebhookClient.parseURL(
    "https://discord.com/api/webhooks/123456789/abcdef123456",
  );
  console.log(`Webhook ID: ${webhookData.id}`);
  console.log(`Webhook Token: ${webhookData.token}`);

  // Use parsed data to create client
  const webhook = new WebhookClient(
    `https://discord.com/api/webhooks/${webhookData.id}/${webhookData.token}`,
  );
} catch (error) {
  console.error("Invalid webhook URL:", error.message);
}
```

---

**Navigation:**

- [← Back to API Reference](README.md)
- [← Channel Class](Channel.md)
- [Client Class](Client.md)
- [Message Class](Message.md)
