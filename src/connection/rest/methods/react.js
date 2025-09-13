/**
 * React to a message with an emoji
 * @param {RestManager} rest - The REST manager instance
 * @param {string} channelId - The channel ID
 * @param {string} messageId - The message ID
 * @param {string} emoji - The emoji to react with (unicode or custom emoji)
 * @returns {Promise<void>}
 */
async function react(rest, channelId, messageId, emoji) {
  // Encode emoji for URL (e.g., 😀 -> %F0%9F%98%80, or custom:123 -> custom%3A123)
  const encodedEmoji = encodeURIComponent(emoji);
  return await rest.request(
    `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`,
    {
      method: "PUT",
    },
  );
}

module.exports = react;
