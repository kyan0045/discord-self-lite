# Examples

Comprehensive examples and use cases for discord-self-lite.

## 📁 Example Files

Before exploring these examples, check out the complete example files:

- **[Client Example](../examples/client-example.js)** - Complete Discord client example
- **[Webhook Example](../examples/webhook-example.js)** - Comprehensive webhook usage

## 🤖 Basic Bot Examples

### Simple Command Bot

```javascript
const { Client } = require("discord-self-lite");

const client = new Client();

client.login("YOUR_TOKEN_HERE");

client.on("ready", (data) => {
  console.log(`🚀 Ready as ${data.user.username}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Ping command
  if (message.content === "!ping") {
    await message.reply("🏓 Pong!");
  }

  // Echo command
  if (message.content.startsWith("!echo ")) {
    const text = message.content.slice(6);
    await message.reply(`📢 ${text}`);
  }

  // User info command
  if (message.content === "!userinfo") {
    await message.reply({
      embeds: [
        {
          title: "👤 User Information",
          fields: [
            { name: "Username", value: message.author.username, inline: true },
            { name: "ID", value: message.author.id, inline: true },
            {
              name: "Bot",
              value: message.author.bot ? "Yes" : "No",
              inline: true,
            },
          ],
          color: 0x3498db,
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }
});
```

### Auto-Reaction Bot

```javascript
client.on("messageCreate", async (message) => {
  const content = message.content.toLowerCase();

  // React to greetings
  if (content.includes("hello") || content.includes("hi")) {
    await message.react("👋");
  }

  // React to positive words
  if (
    content.includes("good") ||
    content.includes("awesome") ||
    content.includes("great")
  ) {
    await message.react("👍");
  }

  // React to love
  if (content.includes("love") || content.includes("❤️")) {
    await message.react("❤️");
  }

  // React to questions
  if (content.includes("?")) {
    await message.react("🤔");
  }

  // Multiple reactions for celebrations
  if (content.includes("party") || content.includes("celebration")) {
    await message.react("🎉");
    await message.react("🎊");
    await message.react("🥳");
  }
});
```

## 🔘 Button Interaction Examples

### Automatic Button Clicker

```javascript
client.on("messageCreate", async (message) => {
  // Check if message has buttons
  if (message.components && message.components.length > 0) {
    console.log("🔘 Found message with buttons");

    // Log all available buttons
    message.components.forEach((row, rowIndex) => {
      row.components.forEach((component, componentIndex) => {
        if (component.type === 2) {
          // Button type
          console.log(
            `Button: "${component.label}" (ID: ${component.custom_id})`,
          );
        }
      });
    });

    // Click first button automatically
    await message.clickButton(0);
    console.log("✅ Clicked first button");
  }
});
```

### Smart Button Handler

```javascript
client.on("messageCreate", async (message) => {
  if (!message.components || message.components.length === 0) return;

  // Only interact with specific bots
  const allowedBots = ["BOT_ID_1", "BOT_ID_2"];
  if (!allowedBots.includes(message.author.id)) return;

  // Wait a bit to seem more human-like
  await new Promise((resolve) =>
    setTimeout(resolve, 1000 + Math.random() * 2000),
  );

  try {
    // Try specific button IDs first
    const buttonPreferences = ["confirm", "accept", "yes", "continue", "next"];

    for (const customId of buttonPreferences) {
      try {
        await message.clickButton(customId);
        console.log(`✅ Clicked button: ${customId}`);
        return;
      } catch (error) {
        // Button with this ID doesn't exist, try next
        continue;
      }
    }

    // Fallback to first button
    await message.clickButton(0);
    console.log("✅ Clicked first available button");
  } catch (error) {
    console.error("❌ Failed to click button:", error);
  }
});
```

## 📊 Monitoring and Analytics

### Channel Activity Monitor

```javascript
const channelStats = new Map();

client.on("messageCreate", (message) => {
  const channelId = message.channelId;

  if (!channelStats.has(channelId)) {
    channelStats.set(channelId, {
      messageCount: 0,
      userCount: new Set(),
      lastActive: null,
      channelName: message.channel.name,
    });
  }

  const stats = channelStats.get(channelId);
  stats.messageCount++;
  stats.userCount.add(message.author.id);
  stats.lastActive = new Date();

  // Report stats every 100 messages
  if (stats.messageCount % 100 === 0) {
    console.log(
      `📊 ${stats.channelName}: ${stats.messageCount} messages, ${stats.userCount.size} unique users`,
    );
  }
});

// Report top channels every hour
setInterval(
  () => {
    console.log("📈 Top active channels:");
    Array.from(channelStats.entries())
      .sort(([, a], [, b]) => b.messageCount - a.messageCount)
      .slice(0, 5)
      .forEach(([channelId, stats]) => {
        console.log(`  ${stats.channelName}: ${stats.messageCount} messages`);
      });
  },
  60 * 60 * 1000,
);
```

### Keyword Tracker

```javascript
const keywords = ["discord", "bot", "api", "help", "error"];
const keywordCounts = new Map();

client.on("messageCreate", (message) => {
  const content = message.content.toLowerCase();

  keywords.forEach((keyword) => {
    if (content.includes(keyword)) {
      const count = keywordCounts.get(keyword) || 0;
      keywordCounts.set(keyword, count + 1);

      console.log(
        `🔍 Keyword "${keyword}" mentioned (${count + 1} times total)`,
      );
    }
  });
});

// Report keyword stats
setInterval(
  () => {
    console.log("📊 Keyword Statistics:");
    keywordCounts.forEach((count, keyword) => {
      console.log(`  ${keyword}: ${count} mentions`);
    });
  },
  30 * 60 * 1000,
); // Every 30 minutes
```

## 🪝 Webhook Examples

### Status Notification System

```javascript
const { WebhookClient } = require("discord-self-lite");

const statusWebhook = new WebhookClient("YOUR_WEBHOOK_URL", {
  username: "Status Monitor",
  avatarURL: "https://example.com/status-icon.png",
});

async function sendStatusUpdate(service, status, details) {
  const colors = {
    online: 0x2ecc71,
    warning: 0xf39c12,
    offline: 0xe74c3c,
  };

  const icons = {
    online: "✅",
    warning: "⚠️",
    offline: "❌",
  };

  const embed = WebhookClient.createEmbed({
    title: `${icons[status]} ${service} Status`,
    description: details,
    color: colors[status],
    timestamp: new Date().toISOString(),
    fields: [
      { name: "Service", value: service, inline: true },
      { name: "Status", value: status.toUpperCase(), inline: true },
      { name: "Checked", value: new Date().toLocaleString(), inline: true },
    ],
  });

  await statusWebhook.send({ embeds: [embed] });
}

// Usage
await sendStatusUpdate("Database", "online", "All connections healthy");
await sendStatusUpdate("API Server", "warning", "High response times detected");
await sendStatusUpdate(
  "Payment Gateway",
  "offline",
  "Service temporarily unavailable",
);
```

### Error Reporting Webhook

```javascript
const errorWebhook = new WebhookClient("YOUR_ERROR_WEBHOOK_URL", {
  username: "Error Reporter",
  avatarURL: "https://example.com/error-icon.png",
});

async function reportError(error, context = {}) {
  const embed = WebhookClient.createEmbed({
    title: "🚨 Error Detected",
    description: `\`\`\`javascript\n${error.stack}\n\`\`\``,
    color: 0xff0000,
    timestamp: new Date().toISOString(),
    fields: [
      { name: "Error Type", value: error.name, inline: true },
      { name: "Message", value: error.message, inline: true },
      { name: "File", value: context.file || "Unknown", inline: true },
      { name: "Function", value: context.function || "Unknown", inline: true },
      { name: "User ID", value: context.userId || "Unknown", inline: true },
      { name: "Timestamp", value: new Date().toISOString(), inline: true },
    ],
  });

  await errorWebhook.send({
    content: "**🔥 Critical Error Alert**",
    embeds: [embed],
  });
}

// Global error handler
process.on("uncaughtException", (error) => {
  reportError(error, { function: "global", file: "process" });
});

// Usage in try-catch
try {
  // Some risky code
  throw new Error("Something went wrong");
} catch (error) {
  await reportError(error, {
    function: "messageHandler",
    file: "bot.js",
    userId: message?.author?.id,
  });
}
```

## 🎯 Advanced Use Cases

### Message Backup System

```javascript
const fs = require("fs").promises;

async function backupChannel(channelId, maxMessages = 1000) {
  const channel = await client.fetchChannel(channelId);
  const allMessages = [];
  let lastId = null;

  console.log(`📥 Backing up ${channel.name}...`);

  while (allMessages.length < maxMessages) {
    const options = {
      limit: Math.min(100, maxMessages - allMessages.length),
    };
    if (lastId) options.before = lastId;

    const messages = await channel.fetchMessages(options);
    if (messages.length === 0) break;

    allMessages.push(
      ...messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        author: msg.author.username,
        timestamp: msg.timestamp,
        embeds: msg.embeds,
        attachments: msg.attachments.map((att) => att.url),
      })),
    );

    lastId = messages[messages.length - 1].id;
    console.log(`📊 Backed up ${allMessages.length} messages...`);

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Save to file
  const filename = `backup_${channel.name}_${Date.now()}.json`;
  await fs.writeFile(filename, JSON.stringify(allMessages, null, 2));
  console.log(`✅ Backup saved to ${filename}`);

  return allMessages;
}

// Usage
await backupChannel("YOUR_CHANNEL_ID", 500);
```

### Auto-Moderator

```javascript
const bannedWords = ["spam", "badword1", "badword2"];
const warningCounts = new Map();

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();
  const foundBadWords = bannedWords.filter((word) => content.includes(word));

  if (foundBadWords.length > 0) {
    const userId = message.author.id;
    const warnings = warningCounts.get(userId) || 0;
    warningCounts.set(userId, warnings + 1);

    // React with warning
    await message.react("⚠️");

    // Send warning via DM (if possible)
    try {
      const dmChannel = await client.createDM(userId);
      await dmChannel.send(
        `⚠️ Warning: Please avoid using inappropriate language. Warning ${
          warnings + 1
        }/3`,
      );

      if (warnings >= 2) {
        await dmChannel.send(
          "🚫 Final warning: Further violations may result in action being taken.",
        );
      }
    } catch (error) {
      console.log("Could not send DM to user");
    }

    console.log(
      `⚠️ User ${
        message.author.username
      } used banned words: ${foundBadWords.join(", ")}`,
    );
  }
});
```

### Data Analytics Dashboard

```javascript
const analytics = {
  totalMessages: 0,
  messagesByHour: new Array(24).fill(0),
  topUsers: new Map(),
  topChannels: new Map(),
  startTime: Date.now(),
};

client.on("messageCreate", (message) => {
  analytics.totalMessages++;

  // Track by hour
  const hour = new Date().getHours();
  analytics.messagesByHour[hour]++;

  // Track top users
  const username = message.author.username;
  analytics.topUsers.set(username, (analytics.topUsers.get(username) || 0) + 1);

  // Track top channels
  const channelName = message.channel.name || "DM";
  analytics.topChannels.set(
    channelName,
    (analytics.topChannels.get(channelName) || 0) + 1,
  );
});

// Report analytics every hour
setInterval(
  async () => {
    const uptime = Math.floor(
      (Date.now() - analytics.startTime) / 1000 / 60 / 60,
    );
    const avgPerHour = analytics.totalMessages / Math.max(uptime, 1);

    const report = WebhookClient.createEmbed({
      title: "📊 Analytics Report",
      color: 0x3498db,
      timestamp: new Date().toISOString(),
      fields: [
        {
          name: "Total Messages",
          value: analytics.totalMessages.toString(),
          inline: true,
        },
        { name: "Uptime (hours)", value: uptime.toString(), inline: true },
        { name: "Avg/Hour", value: avgPerHour.toFixed(1), inline: true },
        {
          name: "Top Users",
          value:
            Array.from(analytics.topUsers.entries())
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([user, count]) => `${user}: ${count}`)
              .join("\n") || "None",
          inline: true,
        },
        {
          name: "Top Channels",
          value:
            Array.from(analytics.topChannels.entries())
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([channel, count]) => `${channel}: ${count}`)
              .join("\n") || "None",
          inline: true,
        },
      ],
    });

    const analyticsWebhook = new WebhookClient("YOUR_ANALYTICS_WEBHOOK_URL");
    await analyticsWebhook.send({ embeds: [report] });
  },
  60 * 60 * 1000,
); // Every hour
```

## 🛠️ Utility Functions

### Message Formatter

```javascript
function formatMessage(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match;
  });
}

// Usage
const template =
  "Hello {{username}}! You have {{count}} new messages in {{channel}}.";
const formatted = formatMessage(template, {
  username: "John",
  count: 5,
  channel: "#general",
});

await message.reply(formatted);
```

### Rate Limiter

```javascript
class RateLimiter {
  constructor(maxRequests = 5, windowMs = 60000) {
    this.requests = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(userId) {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];

    // Remove old requests
    const validRequests = userRequests.filter(
      (time) => now - time < this.windowMs,
    );

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(userId, validRequests);
    return true;
  }
}

const rateLimiter = new RateLimiter(3, 60000); // 3 requests per minute

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!")) return;

  if (!rateLimiter.canMakeRequest(message.author.id)) {
    await message.react("⏰");
    return;
  }

  // Process command
  if (message.content === "!help") {
    await message.reply("Help message here!");
  }
});
```

---

**Navigation:**

- [← Back to Documentation](README.md)
- [Getting Started](getting-started.md)
- [API Reference](api/README.md)
