const { Client } = require("../src/index.js");

const client = new Client();

client.login("YOUR_TOKEN_HERE");

client.on("ready", async () => {
  console.log("✅ Connected! Testing awaitMessage...\n");

  // Example 1: Wait for any message in a specific channel
  const channelId = "YOUR_CHANNEL_ID";
  const channel = client.getChannel(channelId);

  console.log("📩 Waiting for any message in the channel...");
  try {
    const message = await channel.awaitMessage({ time: 10000 });
    console.log(
      `✅ Received: "${message.content}" from ${message.author.username}`,
    );
  } catch {
    console.log("❌ Timeout: No message received");
  }

  // Example 2: Wait for a message from a specific user
  const targetUserId = "TARGET_USER_ID";
  console.log("\n📩 Waiting for a message from specific user...");
  try {
    const userMessage = await channel.awaitMessage({
      filter: (msg) => msg.author.id === targetUserId,
      time: 15000,
    });
    console.log(`✅ User said: "${userMessage.content}"`);
  } catch {
    console.log("❌ Timeout: User didn't respond");
  }

  // Example 3: Wait for a message with specific content patterns
  console.log("\n📩 Waiting for confirmation (yes/confirm/accept)...");
  try {
    const confirmation = await channel.awaitMessage({
      filter: (msg) => {
        const content = msg.content.toLowerCase();
        return (
          msg.author.id === targetUserId &&
          (content.includes("yes") ||
            content.includes("confirm") ||
            content.includes("accept") ||
            /^y(es)?$/i.test(content))
        );
      },
      time: 20000,
    });
    console.log(`✅ Confirmed: "${confirmation.content}"`);
  } catch {
    console.log("❌ Timeout: No confirmation received");
  }

  // Example 4: No error on timeout (returns null)
  console.log("\n📩 Waiting without throwing error on timeout...");
  const result = await channel.awaitMessage({
    time: 5000,
    errors: false,
  });
  if (result) {
    console.log(`✅ Message received: "${result.content}"`);
  } else {
    console.log("⏱️ Timeout (no error thrown)");
  }

  console.log("\n✅ All tests completed!");
  process.exit(0);
});

client.on("error", (error) => {
  console.error("❌ Error:", error);
});
