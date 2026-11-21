const { Client } = require("../src/index.js");

// Example demonstrating enhanced rate limit logging
// This example shows how the RestManager now logs specific route information
// when rate limits are encountered

const client = new Client();

// REST rate limit events are emitted on the client's debug channel:
// - Route rate limits: "⏳ Route GET:/channels/123/messages rate limited (bucket ...), waiting {delay}ms"
// - 429 responses: "🚫 Rate limited! Route (GET:/channels/123/messages) limit for /channels/123/messages"
// - Global limits: "⏳ Global rate limit active, waiting {delay}ms"
client.on("debug", (message) => {
  console.log(message);
});

client.on("ready", () => {
  console.log("Client ready! Rate limit logging is now enhanced.");
  console.log(
    "Try sending many messages quickly to see route-specific rate limit logs.",
  );
});

client.on("error", (error) => {
  console.error("Client error:", error);
});

// Uncomment to test (requires valid token):
// client.login("your-token-here");
