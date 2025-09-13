# Channel Class

Represents a Discord channel with messaging capabilities.

## Constructor

```javascript
// Channels are automatically created by the Client
// You don't typically create Channel instances directly
```

Channel objects are created automatically when fetching channels or receiving them through events.

## Methods

### `send(content, options)`

Sends a message to the channel.

**Parameters:**

- `content` (string|object) - The message content or payload object
- `options` (object, optional) - Additional message options
  - `embeds` (Array) - Array of embed objects
  - `tts` (boolean) - Whether the message should be text-to-speech
  - `allowedMentions` (object) - Allowed mention configuration

**Returns:** Promise<Message> - The sent message object

**Examples:**

```javascript
// Simple text message
const message = await channel.send("Hello, channel!");

// Message with embed
await channel.send("Check this out!", {
  embeds: [
    {
      title: "Example Embed",
      description: "This is an example embed",
      color: 0x00ff00,
    },
  ],
});

// Complex payload
await channel.send({
  content: "Complex message",
  embeds: [embed1, embed2],
  tts: false,
});
```

### `fetchMessages(options)`

Fetches messages from the channel.

**Parameters:**

- `options` (object, optional) - Fetch options
  - `limit` (number) - Number of messages to fetch (1-100, default: 50)
  - `before` (string) - Fetch messages before this message ID
  - `after` (string) - Fetch messages after this message ID
  - `around` (string) - Fetch messages around this message ID

**Returns:** Promise<Array<Message>> - Array of message objects

**Examples:**

```javascript
// Fetch last 10 messages
const messages = await channel.fetchMessages({ limit: 10 });

// Fetch messages before a specific message
const olderMessages = await channel.fetchMessages({
  limit: 50,
  before: "123456789012345678",
});

// Fetch messages after a specific message
const newerMessages = await channel.fetchMessages({
  limit: 20,
  after: "123456789012345678",
});

// Fetch messages around a specific message
const aroundMessages = await channel.fetchMessages({
  limit: 10,
  around: "123456789012345678",
});
```

### `isText()`

Checks if the channel is a text channel.

**Returns:** boolean - True if text channel

**Example:**

```javascript
if (channel.isText()) {
  console.log("This is a text channel");
  await channel.send("Hello!");
}
```

### `isDM()`

Checks if the channel is a direct message channel.

**Returns:** boolean - True if DM channel

**Example:**

```javascript
if (channel.isDM()) {
  console.log("This is a DM channel");
  await channel.send("Private message!");
}
```

### `getURL()`

Gets the Discord URL for the channel.

**Returns:** string - The channel URL

**Example:**

```javascript
const url = channel.getURL();
console.log(`Channel URL: ${url}`);
// Output: https://discord.com/channels/GUILD_ID/CHANNEL_ID
```

## Properties

### Core Properties

- **`id`** (string) - Channel ID
- **`name`** (string|null) - Channel name (null for DMs)
- **`type`** (number) - Channel type (0 = text, 1 = DM, 2 = voice, etc.)
- **`guildId`** (string|null) - Guild ID (null for DMs)
- **`position`** (number|null) - Channel position in the channel list
- **`topic`** (string|null) - Channel topic/description
- **`nsfw`** (boolean) - Whether the channel is NSFW
- **`lastMessageId`** (string|null) - ID of the last message in the channel

### Permission Properties

- **`permissionOverwrites`** (Array) - Permission overwrites for the channel
- **`rateLimitPerUser`** (number) - Slowmode duration in seconds
- **`userLimit`** (number|null) - User limit for voice channels

### Thread Properties (if applicable)

- **`threadMetadata`** (object|null) - Thread-specific metadata
- **`memberCount`** (number|null) - Number of members in thread
- **`messageCount`** (number|null) - Number of messages in thread

### Client Access

- **`client`** (Client) - The client instance that owns this channel

## Channel Types

| Type                   | Number | Description               |
| ---------------------- | ------ | ------------------------- |
| `GUILD_TEXT`           | 0      | Text channel in a guild   |
| `DM`                   | 1      | Direct message channel    |
| `GUILD_VOICE`          | 2      | Voice channel in a guild  |
| `GROUP_DM`             | 3      | Group direct message      |
| `GUILD_CATEGORY`       | 4      | Category channel          |
| `GUILD_NEWS`           | 5      | News/announcement channel |
| `GUILD_STORE`          | 6      | Store channel             |
| `GUILD_NEWS_THREAD`    | 10     | News thread               |
| `GUILD_PUBLIC_THREAD`  | 11     | Public thread             |
| `GUILD_PRIVATE_THREAD` | 12     | Private thread            |
| `GUILD_STAGE_VOICE`    | 13     | Stage voice channel       |

## Examples

### Basic Channel Operations

```javascript
// Fetch a channel
const channel = await client.fetchChannel("123456789012345678");

// Check channel type
console.log(`Channel: ${channel.name} (Type: ${channel.type})`);

if (channel.isText()) {
  // Send a message
  await channel.send("Hello from the bot!");

  // Fetch recent messages
  const messages = await channel.fetchMessages({ limit: 5 });
  console.log(`Found ${messages.length} recent messages`);
}
```

### Message History Analysis

```javascript
async function analyzeChannel(channel) {
  console.log(`📊 Analyzing channel: ${channel.name}`);

  try {
    // Fetch recent messages
    const messages = await channel.fetchMessages({ limit: 100 });

    // Analyze messages
    const userCounts = {};
    const wordCounts = {};

    messages.forEach((message) => {
      // Count messages per user
      const username = message.author.username;
      userCounts[username] = (userCounts[username] || 0) + 1;

      // Count words
      const words = message.content.toLowerCase().split(/\s+/);
      words.forEach((word) => {
        if (word.length > 3) {
          // Ignore short words
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });

    // Report results
    console.log("👥 Most active users:");
    Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([user, count]) => {
        console.log(`  ${user}: ${count} messages`);
      });

    console.log("💬 Most common words:");
    Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([word, count]) => {
        console.log(`  ${word}: ${count} times`);
      });
  } catch (error) {
    console.error("❌ Error analyzing channel:", error);
  }
}

// Use the analyzer
const channel = await client.fetchChannel("YOUR_CHANNEL_ID");
await analyzeChannel(channel);
```

### Channel Monitoring

```javascript
async function monitorChannel(channelId) {
  const channel = await client.fetchChannel(channelId);

  console.log(`👀 Monitoring channel: ${channel.name}`);
  console.log(
    `📊 Channel info: ${channel.type === 0 ? "Text" : "Other"} channel`,
  );

  if (channel.topic) {
    console.log(`📝 Topic: ${channel.topic}`);
  }

  // Monitor new messages
  client.on("messageCreate", async (message) => {
    if (message.channelId === channelId) {
      console.log(`📨 New message in ${channel.name}: ${message.content}`);

      // Auto-react to certain keywords
      if (message.content.toLowerCase().includes("important")) {
        await message.react("⚠️");
      }

      if (message.content.toLowerCase().includes("help")) {
        await message.react("🆘");
        await message.reply(
          "I see you need help! Someone will assist you soon.",
        );
      }
    }
  });
}

// Start monitoring
await monitorChannel("YOUR_CHANNEL_ID");
```

### Bulk Message Operations

```javascript
async function fetchAllMessages(channel, maxMessages = 1000) {
  const allMessages = [];
  let lastId = null;

  console.log(`📥 Fetching messages from ${channel.name}...`);

  while (allMessages.length < maxMessages) {
    const options = { limit: Math.min(100, maxMessages - allMessages.length) };
    if (lastId) options.before = lastId;

    const messages = await channel.fetchMessages(options);

    if (messages.length === 0) break; // No more messages

    allMessages.push(...messages);
    lastId = messages[messages.length - 1].id;

    console.log(`📊 Fetched ${allMessages.length} messages so far...`);

    // Rate limiting delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`✅ Finished! Fetched ${allMessages.length} total messages`);
  return allMessages;
}

// Usage
const channel = await client.fetchChannel("YOUR_CHANNEL_ID");
const allMessages = await fetchAllMessages(channel, 500);
```

### Channel Type Checking

```javascript
function handleChannel(channel) {
  console.log(`🔍 Channel: ${channel.name || "DM"} (ID: ${channel.id})`);

  if (channel.isDM()) {
    console.log("💬 This is a direct message channel");
    return;
  }

  if (channel.isText()) {
    console.log("📝 This is a text channel");

    if (channel.nsfw) {
      console.log("🔞 This channel is marked as NSFW");
    }

    if (channel.rateLimitPerUser > 0) {
      console.log(`⏱️ Slowmode: ${channel.rateLimitPerUser} seconds`);
    }

    if (channel.topic) {
      console.log(`📋 Topic: ${channel.topic}`);
    }
  }

  // Get channel URL
  const url = channel.getURL();
  console.log(`🔗 URL: ${url}`);
}

// Handle different channel types
client.on("messageCreate", (message) => {
  handleChannel(message.channel);
});
```

### Message Search

```javascript
async function searchMessages(channel, searchTerm, limit = 100) {
  console.log(`🔍 Searching for "${searchTerm}" in ${channel.name}...`);

  const messages = await channel.fetchMessages({ limit });
  const matches = messages.filter((message) =>
    message.content.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  console.log(`📊 Found ${matches.length} messages containing "${searchTerm}"`);

  matches.forEach((message) => {
    console.log(
      `📨 ${message.author.username}: ${message.content.substring(0, 100)}...`,
    );
  });

  return matches;
}

// Usage
const channel = await client.fetchChannel("YOUR_CHANNEL_ID");
const results = await searchMessages(channel, "discord", 200);
```

---

**Navigation:**

- [← Back to API Reference](README.md)
- [← Message Class](Message.md)
- [Client Class](Client.md)
- [WebhookClient →](WebhookClient.md)
