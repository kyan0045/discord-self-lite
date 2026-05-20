/**
 * Fetch the current user's member information for a guild
 * @param {RestManager} rest - The REST manager instance
 * @param {string} guildId - The guild ID
 * @returns {Promise<object>} Member data
 */
async function fetchGuildMember(rest, guildId) {
  return await rest.request(`/users/@me/guilds/${guildId}/member`);
}

module.exports = fetchGuildMember;
