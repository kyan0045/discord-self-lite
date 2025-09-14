/**
 * Send a message to a Discord channel
 * @param {RestManager} rest - The REST manager instance
 * @param {string} channelId - The channel ID to send to
 * @param {string|object} payload - Message content or payload object
 * @returns {Promise<object>} The sent message data
 */
async function sendMessage(rest, channelId, payload) {
  // If payload is a string, treat it as content
  const messagePayload =
    typeof payload === "string" ? { content: payload } : payload;

  return await rest.request(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify(messagePayload),
  });
}

module.exports = sendMessage;
