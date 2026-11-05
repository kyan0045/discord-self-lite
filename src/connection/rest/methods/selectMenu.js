/**
 * Submit a select menu interaction.
 * @param {RestManager} rest - The REST manager instance
 * @param {string} channelId - The channel ID
 * @param {string} messageId - The message ID
 * @param {string} applicationId - The application ID
 * @param {string} guildId - The guild ID
 * @param {string} customId - The select menu's custom ID
 * @param {number} componentType - The select menu component type
 * @param {string[]} values - Selected values
 * @param {string} sessionId - The gateway session ID
 * @param {number} [messageFlags=0] - Message flags
 * @returns {Promise<object>} Interaction response
 */
async function selectMenu(
  rest,
  channelId,
  messageId,
  applicationId,
  guildId,
  customId,
  componentType,
  values,
  sessionId,
  messageFlags = 0,
) {
  // Generate a snowflake-like nonce (simplified version)
  const nonce =
    Date.now().toString() + Math.random().toString(36).substring(2, 11);

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
      component_type: componentType,
      custom_id: customId,
      values,
    },
  };

  return await rest.request("/interactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

module.exports = selectMenu;
