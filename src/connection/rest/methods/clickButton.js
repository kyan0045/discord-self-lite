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
  // Generate a snowflake-like nonce (simplified version)
  const nonce = Date.now().toString() + Math.random().toString(36).substr(2, 9);

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
