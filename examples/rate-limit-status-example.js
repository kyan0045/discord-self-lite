const { Client } = require("../src/index.js");

// Example demonstrating rate limit status checking
// This example shows how to check rate limit status before making requests

const client = new Client({
  token: "your-token-here", // Replace with actual token
  intents: ["GUILDS", "GUILD_MESSAGES"],
});

client.on("ready", async () => {
  console.log("Client ready!");

  // Check rate limit status for a specific endpoint
  const status = client.getRateLimitStatus("/channels/123/messages", "POST");
  console.log("Rate limit status:", status);

  // Check if a specific route is rate limited
  const isLimited = client.isRateLimited("/channels/123/messages", "POST");
  console.log("Is rate limited:", isLimited);

  if (!isLimited) {
    console.log("Safe to send message");
    // await channel.send('Hello!');
  } else {
    console.log("Currently rate limited, waiting...");
  }
});

client.on("error", (error) => {
  console.error("Client error:", error);
});

// Uncomment to test (requires valid token):
// client.login();
