const { Client } = require("../index");

// Create a new Discord client
const client = new Client();

// Login with your user token (replace with your actual token)
client.login("YOUR_USER_TOKEN_HERE");

// Event: Bot is ready and connected
client.on("ready", (data) => {
  console.log(
    `🚀 Logged in as ${data.user.username}#${data.user.discriminator}`,
  );
  console.log(`📊 Connected to ${data.guilds.length} guilds`);
  console.log(`👤 User ID: ${client.user.id}`);
});

// Event: New message created
client.on("messageCreate", async (message) => {
  try {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Basic command handling
    if (message.content === "!ping") {
      await message.reply("🏓 Pong!");
    }

    // Echo command
    if (message.content.startsWith("!echo ")) {
      const text = message.content.slice(6);
      await message.reply(`📢 ${text}`);
    }

    // React to specific messages
    if (message.content.includes("hello")) {
      await message.react("👋");
    }

    // Button interaction example
    if (message.components && message.components.length > 0) {
      // Check if the message has buttons and is from a specific user
      if (message.author.id === "SPECIFIC_USER_ID") {
        console.log("🔘 Found message with buttons, clicking first one...");
        await message.clickButton(0); // Click first button
      }
    }

    // Channel information
    if (message.content === "!channelinfo") {
      const channel = message.channel;
      const info = [
        `📺 **Channel Info**`,
        `Name: ${channel.name || "N/A"}`,
        `ID: ${channel.id}`,
        `Type: ${channel.type}`,
        `Is Text: ${channel.isText()}`,
        `Is DM: ${channel.isDM()}`,
        `URL: ${channel.getURL()}`,
      ].join("\n");

      await message.reply(info);
    }

    // Fetch recent messages
    if (message.content === "!recent") {
      const messages = await message.channel.fetchMessages({ limit: 5 });
      const messageList = messages
        .map(
          (msg) =>
            `${msg.author.username}: ${msg.content.slice(0, 50)}${
              msg.content.length > 50 ? "..." : ""
            }`,
        )
        .join("\n");

      await message.reply(
        `📝 **Recent messages:**\n\`\`\`${messageList}\`\`\``,
      );
    }
  } catch (error) {
    console.error("❌ Error handling message:", error);
  }
});

// Event: Guild (server) joined
client.on("guildCreate", (guild) => {
  console.log(`🏰 Joined guild: ${guild.name} (${guild.id})`);
});

// Error handling
client.on("error", (error) => {
  console.error("❌ Client error:", error);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");
  client.destroy();
  process.exit(0);
});

// Further examples
setTimeout(async () => {
  try {
    // Fetch a specific channel
    const channel = await client.fetchChannel("CHANNEL_ID_HERE");
    console.log(`📺 Fetched channel: ${channel.name}`);

    // Send a message to a channel
    const sentMessage = await channel.send("Hello from the client!");
    console.log(`📤 Sent message: ${sentMessage.id}`);

    // Fetch a guild
    const guild = await client.fetchGuild("GUILD_ID_HERE");
    console.log(`🏰 Fetched guild: ${guild.name}`);

    // Get all channels in the guild
    const channels = await guild.fetchChannels();
    console.log(`📺 Guild has ${channels.length} channels`);
  } catch (error) {
    console.error("❌ Error in further examples:", error);
  }
}, 5000); // Run after 5 seconds to ensure connection is established
