const { generateNonce } = require("./sendMessage");

async function clickButton(
  rest,
  channelId,
  messageId,
  applicationId,
  guildId,
  customId,
  sessionId,
  messageFlags = 0,
) {
  const nonce = generateNonce();

  const payload = {
    type: 3, // MESSAGE_COMPONENT
    nonce,
    guild_id: guildId,
    channel_id: channelId,
    message_id: messageId,
    application_id: applicationId,
    session_id: sessionId,
    message_flags: messageFlags,
    data: {
      component_type: 2, // BUTTON
      custom_id: customId,
    },
  };

  return await rest.request("/interactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

module.exports = clickButton;
