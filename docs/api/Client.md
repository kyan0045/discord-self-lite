# Client Class

The main Discord client class for connecting to Discord and handling events.

## Constructor

```javascript
const client = new Client();
```

Creates a new Discord client instance.

## Methods

### `login(token)`

Authenticates and connects to Discord.

**Parameters:**

- `token` (string) - Your Discord user token

**Returns:** Promise that resolves when connection is established

**Example:**

```javascript
await client.login("YOUR_TOKEN_HERE");
```

### `getUser(userId)`

Gets a cached user by ID, creating a lightweight instance if needed.

**Parameters:**

- `userId` (string) - The user ID

**Returns:** User object

**Example:**

```javascript
const user = client.getUser("123456789012345678");
console.log(user.username);
```

### `fetchUser(userId)`

Fetches a user from Discord and updates the cache.

**Parameters:**

- `userId` (string) - The user ID

**Returns:** Promise<User> - Fresh user object

**Example:**

```javascript
const user = await client.fetchUser("123456789012345678");
console.log(user.username);
```

### `getChannel(channelId)`

Gets a cached channel by ID.

**Parameters:**

- `channelId` (string) - The channel ID

**Returns:** Channel object or null if not cached

**Example:**

```javascript
const channel = client.getChannel("123456789012345678");
if (channel) {
  console.log(`Found channel: ${channel.name}`);
}
```

### `fetchChannel(channelId)`

Fetches a channel from Discord API.

**Parameters:**

- `channelId` (string) - The channel ID

**Returns:** Promise<Channel> - Channel object

**Example:**

```javascript
const channel = await client.fetchChannel("123456789012345678");
console.log(`Channel name: ${channel.name}`);
```

### `fetchMessage(channelId, messageId)`

Fetches a specific message from Discord API.

**Parameters:**

- `channelId` (string) - The channel ID
- `messageId` (string) - The message ID

**Returns:** Promise<Message> - Message object

**Example:**

```javascript
const message = await client.fetchMessage(
  "123456789012345678",
  "987654321098765432",
);
console.log(`Message content: ${message.content}`);
```

### `fetchMessages(channelId, options)`

Fetches a batch of messages from a channel.

**Parameters:**

- `channelId` (string) - The channel ID
- `options` (object, optional) - Fetch options
  - `limit` (number) - Number of messages to fetch
  - `before` (string) - Fetch messages before this message ID
  - `after` (string) - Fetch messages after this message ID

**Returns:** Promise<Array> - Array of message data

**Example:**

```javascript
const messages = await client.fetchMessages("123456789012345678", {
  limit: 25,
});
```

### `fetchGuild(guildId)`

Fetches a guild (server) from Discord API.

**Parameters:**

- `guildId` (string) - The guild ID

**Returns:** Promise<Guild> - Guild object

**Example:**

```javascript
const guild = await client.fetchGuild("123456789012345678");
console.log(`Guild name: ${guild.name}`);
```

### `destroy()`

Disconnects from Discord and cleans up resources.

**Example:**

```javascript
client.destroy();
```

## Events

The Client extends EventEmitter and emits the following events:

### `ready`

Emitted when the client is connected and ready.

**Event Data:**

- `user` - User object with bot information
- `guilds` - Array of guild objects
- `session_id` - Session ID

**Example:**

```javascript
client.on("ready", (data) => {
  console.log(
    `🚀 Logged in as ${data.user.username}#${data.user.discriminator}`,
  );
  console.log(`📊 Connected to ${data.guilds.length} guilds`);
});
```

### `messageCreate`

Emitted when a new message is received.

**Event Data:**

- `message` - Message object

**Example:**

```javascript
client.on("messageCreate", async (message) => {
  console.log(
    `📨 New message from ${message.author.username}: ${message.content}`,
  );

  if (message.content === "!ping") {
    await message.reply("Pong!");
  }
});
```

### `error`

Emitted when an error occurs.

**Event Data:**

- `error` - Error object

**Example:**

```javascript
client.on("error", (error) => {
  console.error("❌ Client error:", error);
});
```

## Properties

### `ws`

The WebSocket connection instance.

### `rest`

The REST API manager instance.

### `channels`

Map of cached channels (channelId -> Channel).

### `users`

Map of cached users (userId -> User).

### `user`

Current authenticated user object. This is a `ClientUser` instance and is available after the ready event.

## Complete Example

```javascript
const { Client } = require("discord-self-lite");

const client = new Client();

// Login
client.login("YOUR_TOKEN_HERE");

// Ready event
client.on("ready", (data) => {
  console.log(`🚀 Ready as ${data.user.username}`);

  // Example: Fetch a specific channel on startup
  client
    .fetchChannel("YOUR_CHANNEL_ID")
    .then((channel) => {
      console.log(`📺 Fetched channel: ${channel.name}`);
    })
    .catch(console.error);
});

// Message handling
client.on("messageCreate", async (message) => {
  try {
    // Ignore bot messages
    if (message.author.bot) return;

    // Commands
    if (message.content === "!ping") {
      await message.reply("🏓 Pong!");
    }

    if (message.content === "!channelinfo") {
      const channel = message.channel;
      await message.reply(`📺 Channel: ${channel.name} (${channel.id})`);
    }

    if (message.content.startsWith("!echo ")) {
      const text = message.content.slice(6);
      await message.reply(`📢 ${text}`);
    }

    // Auto-react to specific content
    if (message.content.toLowerCase().includes("hello")) {
      await message.react("👋");
    }

    // Button interaction
    if (message.components && message.components.length > 0) {
      console.log("🔘 Found message with buttons");
      // Click first button after 1 second
      setTimeout(() => {
        message.clickButton(0);
      }, 1000);
    }
  } catch (error) {
    console.error("❌ Error handling message:", error);
  }
});

// Error handling
client.on("error", (error) => {
  console.error("❌ Client error:", error);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down...");
  client.destroy();
  process.exit(0);
});
```

## Advanced Usage

### Channel Management

```javascript
// Get cached channel (fast)
const channel = client.getChannel("channel_id");

// Fetch from API (slower but always up-to-date)
const channel = await client.fetchChannel("channel_id");

// Send message to channel
await channel.send("Hello!");

// Fetch message history
const messages = await channel.fetchMessages({ limit: 50 });
```

### Message Fetching

```javascript
// Fetch specific message
const message = await client.fetchMessage("channel_id", "message_id");

// Reply to the fetched message
await message.reply("This is a reply to an old message!");
```

### Error Handling

```javascript
client.on("error", (error) => {
  if (error.code === "ECONNRESET") {
    console.log("🔄 Connection reset, will reconnect...");
  } else if (error.message.includes("Unauthorized")) {
    console.error("❌ Invalid token!");
  } else {
    console.error("❌ Unknown error:", error);
  }
});
```

---

**Navigation:**

- [← Back to API Reference](README.md)
- [Message Class →](Message.md)
- [Channel Class →](Channel.md)
- [WebhookClient →](WebhookClient.md)
