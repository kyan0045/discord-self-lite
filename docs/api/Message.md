# Message Class

Represents a Discord message with interaction capabilities.

## Constructor

```javascript
// Messages are automatically created by the Client
// You don't typically create Message instances directly
```

Message objects are created automatically when receiving messages through the `messageCreate` event or when fetching messages.

## Methods

### `reply(content, options)`

Replies to the message with a reference to the original message.

**Parameters:**

- `content` (string|object) - The message content or payload object
- `options` (object, optional) - Additional message options
  - `embeds` (Array) - Array of embed objects
  - `tts` (boolean) - Whether the message should be text-to-speech
  - `allowedMentions` (object) - Allowed mention configuration

**Returns:** Promise<Message> - The sent reply message

**Examples:**

```javascript
// Simple text reply
await message.reply("Hello there!");

// Reply with embed
await message.reply("Check this out!", {
  embeds: [
    {
      title: "Example Embed",
      description: "This is an embed in a reply",
      color: 0x00ff00,
    },
  ],
});

// Reply with payload object
await message.reply({
  content: "Complex reply",
  embeds: [embed],
  tts: false,
});
```

### `react(emoji)`

Adds a reaction to the message.

**Parameters:**

- `emoji` (string) - The emoji to react with (Unicode or custom emoji ID)

**Returns:** Promise<void>

**Examples:**

```javascript
// Unicode emoji
await message.react("👍");
await message.react("❤️");
await message.react("🚀");

// Custom emoji (use emoji ID)
await message.react("123456789012345678");

// Custom emoji with name (if you have the full format)
await message.react("<:custom_name:123456789012345678>");
```

### `clickButton(identifier)`

Clicks a button on the message.

**Parameters:**

- `identifier` (number|string|null, optional) - Button identifier:
  - `null` or omitted: Clicks the first button
  - `number`: Clicks button at index (0-based)
  - `string`: Clicks button with matching custom_id

**Returns:** Promise<void>

**Examples:**

```javascript
// Click first button
await message.clickButton();
await message.clickButton(null);

// Click button by index
await message.clickButton(0); // First button
await message.clickButton(1); // Second button
await message.clickButton(2); // Third button

// Click button by custom ID
await message.clickButton("confirm_button");
await message.clickButton("cancel_action");
await message.clickButton("next_page");

// Check if message has buttons first
if (message.components && message.components.length > 0) {
  await message.clickButton(0);
}
```

## Properties

### Core Properties

- **`id`** (string) - Message ID
- **`content`** (string) - Message content/text
- **`channelId`** (string) - ID of the channel the message was sent in
- **`guildId`** (string|null) - ID of the guild (null for DMs)
- **`timestamp`** (string) - ISO timestamp when message was created
- **`editedTimestamp`** (string|null) - ISO timestamp when message was last edited

### Author Information

- **`author`** (object) - Message author information
  - `id` (string) - Author's user ID
  - `username` (string) - Author's username
  - `discriminator` (string) - Author's discriminator (#0000)
  - `avatar` (string|null) - Author's avatar hash
  - `bot` (boolean) - Whether the author is a bot
  - `system` (boolean) - Whether the author is a system user

### Message Content

- **`embeds`** (Array) - Array of embed objects
- **`attachments`** (Array) - Array of file attachments
- **`components`** (Array) - Array of message components (buttons, select menus)
- **`mentions`** (Array) - Array of mentioned users
- **`mentionRoles`** (Array) - Array of mentioned role IDs
- **`mentionEveryone`** (boolean) - Whether @everyone was mentioned

### Message Features

- **`tts`** (boolean) - Whether the message is text-to-speech
- **`pinned`** (boolean) - Whether the message is pinned
- **`type`** (number) - Message type (0 = default, 19 = reply, etc.)
- **`flags`** (number) - Message flags bitfield
- **`referencedMessage`** (object|null) - Referenced message for replies

### Channel Access

- **`channel`** (Channel) - The channel this message belongs to (getter)

## Examples

### Basic Message Handling

```javascript
client.on("messageCreate", async (message) => {
  // Check message properties
  console.log(`📨 Message from ${message.author.username}: ${message.content}`);
  console.log(`📺 In channel: ${message.channel.name}`);
  console.log(`🕒 Sent at: ${new Date(message.timestamp).toLocaleString()}`);

  // Ignore bot messages
  if (message.author.bot) return;

  // Basic commands
  if (message.content === "!ping") {
    await message.reply("🏓 Pong!");
  }
});
```

### Command System

```javascript
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.slice(1).split(" ");
  const command = args.shift().toLowerCase();

  switch (command) {
    case "ping":
      await message.reply("🏓 Pong!");
      break;

    case "echo":
      const text = args.join(" ");
      await message.reply(`📢 ${text}`);
      break;

    case "userinfo":
      await message.reply({
        embeds: [
          {
            title: "👤 User Information",
            fields: [
              {
                name: "Username",
                value: message.author.username,
                inline: true,
              },
              { name: "ID", value: message.author.id, inline: true },
              {
                name: "Bot",
                value: message.author.bot ? "Yes" : "No",
                inline: true,
              },
            ],
            color: 0x3498db,
          },
        ],
      });
      break;

    case "react":
      await message.react("✅");
      await message.reply("Reacted to your message!");
      break;
  }
});
```

### Button Interaction Handler

```javascript
client.on("messageCreate", async (message) => {
  // Check for buttons in the message
  if (message.components && message.components.length > 0) {
    console.log("🔘 Found message with interactive components");

    // Log all available buttons
    message.components.forEach((row, rowIndex) => {
      row.components.forEach((component, componentIndex) => {
        if (component.type === 2) {
          // Button type
          console.log(
            `Button ${rowIndex}-${componentIndex}: "${component.label}" (ID: ${component.custom_id})`,
          );
        }
      });
    });

    // Example: Auto-click specific buttons
    if (message.author.id === "SPECIFIC_BOT_ID") {
      // Click button with specific custom ID
      try {
        await message.clickButton("confirm");
        console.log("✅ Clicked confirm button");
      } catch (error) {
        // Try clicking first button if custom ID not found
        await message.clickButton(0);
        console.log("✅ Clicked first button");
      }
    }
  }
});
```

### Reaction Handler

```javascript
client.on("messageCreate", async (message) => {
  // Auto-react to specific content
  const content = message.content.toLowerCase();

  if (content.includes("hello") || content.includes("hi")) {
    await message.react("👋");
  }

  if (content.includes("good") || content.includes("awesome")) {
    await message.react("👍");
  }

  if (content.includes("love") || content.includes("❤️")) {
    await message.react("❤️");
  }

  // React with multiple emojis
  if (content.includes("celebration")) {
    await message.react("🎉");
    await message.react("🎊");
    await message.react("🥳");
  }
});
```

### Embed Reply

```javascript
client.on("messageCreate", async (message) => {
  if (message.content === "!serverinfo") {
    await message.reply({
      embeds: [
        {
          title: "🏰 Server Information",
          description: `Information about ${
            message.channel.guild?.name || "this server"
          }`,
          fields: [
            { name: "Channel", value: message.channel.name, inline: true },
            { name: "Channel ID", value: message.channelId, inline: true },
            { name: "Message ID", value: message.id, inline: true },
          ],
          color: 0x5865f2,
          timestamp: new Date().toISOString(),
          footer: { text: "discord-self-lite" },
        },
      ],
    });
  }
});
```

### Message Analysis

```javascript
client.on("messageCreate", (message) => {
  // Analyze message properties
  console.log("📊 Message Analysis:");
  console.log(`- Content length: ${message.content.length} characters`);
  console.log(`- Has embeds: ${message.embeds.length > 0 ? "Yes" : "No"}`);
  console.log(
    `- Has attachments: ${message.attachments.length > 0 ? "Yes" : "No"}`,
  );
  console.log(
    `- Has components: ${message.components.length > 0 ? "Yes" : "No"}`,
  );
  console.log(
    `- Mentions users: ${message.mentions.length > 0 ? "Yes" : "No"}`,
  );
  console.log(`- Is reply: ${message.type === 19 ? "Yes" : "No"}`);
  console.log(`- Is edited: ${message.editedTimestamp ? "Yes" : "No"}`);

  // Check for specific content types
  if (message.embeds.length > 0) {
    console.log(`📋 Found ${message.embeds.length} embed(s)`);
  }

  if (message.attachments.length > 0) {
    console.log(`📎 Found ${message.attachments.length} attachment(s)`);
  }
});
```

---

**Navigation:**

- [← Back to API Reference](README.md)
- [← Client Class](Client.md)
- [Channel Class →](Channel.md)
- [WebhookClient →](WebhookClient.md)
