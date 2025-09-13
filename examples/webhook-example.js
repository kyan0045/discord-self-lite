/* eslint-disable no-unused-vars */
const { WebhookClient } = require("../index");

// Create a webhook client (replace with your webhook URL)
const webhook = new WebhookClient(
  "https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN",
  {
    username: "Example Bot",
    avatarURL: "https://example.com/avatar.png",
  },
);

async function runExamples() {
  try {
    // 1. Send a simple text message
    console.log("📤 Sending simple message...");
    const message1 = await webhook.send("Hello, world! 🌍");
    console.log(`✅ Sent message: ${message1.id}`);

    // 2. Send a message with options
    console.log("📤 Sending message with custom options...");
    const message2 = await webhook.send("This is a TTS message", {
      tts: true,
      username: "Custom Name",
      avatarURL: "https://example.com/custom-avatar.png",
    });
    console.log(`✅ Sent TTS message: ${message2.id}`);

    // 3. Send an embed
    console.log("📤 Sending embed...");
    const embed = WebhookClient.createEmbed({
      title: "Example Embed",
      description: "This is an example embed created using the helper method",
      color: 0x00ff00,
      footer: {
        text: "Footer text",
        iconURL: "https://example.com/footer.png",
      },
      fields: [
        { name: "Field 1", value: "Value 1", inline: true },
        { name: "Field 2", value: "Value 2", inline: true },
      ],
    });

    const message3 = await webhook.send(embed);
    console.log(`✅ Sent embed: ${message3.id}`);

    // 4. Send multiple embeds
    console.log("📤 Sending multiple embeds...");
    const embeds = [
      {
        title: "First Embed",
        description: "This is the first embed",
        color: 0xff0000,
      },
      {
        title: "Second Embed",
        description: "This is the second embed",
        color: 0x0000ff,
      },
    ];

    const message4 = await webhook.send(embeds);
    console.log(`✅ Sent multiple embeds: ${message4.id}`);

    // 5. Send complex payload
    console.log("📤 Sending complex payload...");
    const message5 = await webhook.send({
      content: "Check out this awesome embed! 🚀",
      embeds: [
        {
          title: "Complex Example",
          description: "This demonstrates multiple features",
          color: 0x9932cc,
          thumbnail: { url: "https://example.com/thumbnail.png" },
          author: {
            name: "Example Author",
            url: "https://example.com",
            icon_url: "https://example.com/author.png",
          },
          fields: [
            { name: "Status", value: "✅ Online", inline: true },
            { name: "Version", value: "v1.0.0", inline: true },
            { name: "\u200B", value: "\u200B", inline: false }, // Empty field for spacing
            {
              name: "Description",
              value: "A longer description field that spans the full width",
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
      username: "Complex Bot",
      avatarURL: "https://example.com/complex-avatar.png",
    });
    console.log(`✅ Sent complex message: ${message5.id}`);

    // Wait a bit before editing/deleting
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 6. Edit a message
    console.log("✏️ Editing message...");
    await webhook.edit(message1.id, "This message has been edited! ✏️");
    console.log("✅ Message edited successfully");

    // 7. Fetch a message
    console.log("📥 Fetching message...");
    const fetchedMessage = await webhook.fetchMessage(message1.id);
    console.log(`✅ Fetched message: "${fetchedMessage.content}"`);

    // Wait before cleanup
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 8. Clean up - delete test messages
    console.log("🗑️ Cleaning up test messages...");
    const messages = [message1, message2, message3, message4, message5];

    for (const msg of messages) {
      if (msg && msg.id) {
        try {
          await webhook.delete(msg.id);
          console.log(`✅ Deleted message: ${msg.id}`);
          await new Promise((resolve) => setTimeout(resolve, 500)); // Rate limit delay
        } catch (error) {
          console.log(
            `⚠️ Could not delete message ${msg.id}: ${error.message}`,
          );
        }
      }
    }

    console.log("🎉 All examples completed successfully!");
  } catch (error) {
    console.error("❌ Error running examples:", error);
  }
}

// Additional utility functions
async function sendStatusUpdate(status, color = 0x00ff00) {
  const embed = WebhookClient.createEmbed({
    title: "📊 Status Update",
    description: status,
    color: color,
    timestamp: new Date().toISOString(),
    footer: { text: "Automated Status" },
  });

  return await webhook.send(embed);
}

async function sendErrorReport(error) {
  const embed = WebhookClient.createEmbed({
    title: "❌ Error Report",
    description: `\`\`\`\n${error.message}\n\`\`\``,
    color: 0xff0000,
    timestamp: new Date().toISOString(),
    fields: [
      { name: "Error Type", value: error.name || "Unknown", inline: true },
      { name: "Timestamp", value: new Date().toLocaleString(), inline: true },
    ],
  });

  return await webhook.send(embed);
}

async function sendPerformanceMetrics(metrics) {
  const embed = WebhookClient.createEmbed({
    title: "📈 Performance Metrics",
    color: 0x00ffff,
    fields: [
      { name: "CPU Usage", value: `${metrics.cpu}%`, inline: true },
      { name: "Memory Usage", value: `${metrics.memory}MB`, inline: true },
      { name: "Uptime", value: metrics.uptime, inline: true },
      {
        name: "Requests/min",
        value: metrics.requestsPerMin.toString(),
        inline: true,
      },
      {
        name: "Active Users",
        value: metrics.activeUsers.toString(),
        inline: true,
      },
      { name: "Error Rate", value: `${metrics.errorRate}%`, inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "System Monitoring" },
  });

  return await webhook.send(embed);
}

async function sendNotification(title, message, type = "info") {
  const colors = {
    info: 0x3498db,
    success: 0x2ecc71,
    warning: 0xf39c12,
    error: 0xe74c3c,
  };

  const icons = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌",
  };

  const embed = WebhookClient.createEmbed({
    title: `${icons[type]} ${title}`,
    description: message,
    color: colors[type],
    timestamp: new Date().toISOString(),
  });

  return await webhook.send(embed);
}

// URL parsing example
try {
  const parsed = WebhookClient.parseURL(
    "https://discord.com/api/webhooks/123456789/abcdefghijklmnop",
  );
  console.log("🔗 Parsed webhook URL:", parsed);
} catch (error) {
  console.log("⚠️ Example URL parsing (expected to fail with example URL)");
}

// Example usage of utility functions
async function demonstrateUtilities() {
  console.log("🔧 Demonstrating utility functions...");

  // Status update
  await sendStatusUpdate("System is running smoothly", 0x00ff00);

  // Performance metrics
  await sendPerformanceMetrics({
    cpu: 45,
    memory: 512,
    uptime: "5 days, 12 hours",
    requestsPerMin: 150,
    activeUsers: 1250,
    errorRate: 0.5,
  });

  // Notifications
  await sendNotification(
    "Deployment Complete",
    "Version 2.1.0 has been successfully deployed",
    "success",
  );
  await sendNotification(
    "High Memory Usage",
    "Memory usage is above 80% threshold",
    "warning",
  );

  console.log("✅ Utility functions demonstrated");
}

// Run the examples
console.log("🚀 Starting webhook examples...");
console.log("⚠️ Make sure to replace the webhook URL with a real one!");

// Uncomment the lines below to run the examples
// runExamples();
// demonstrateUtilities();
