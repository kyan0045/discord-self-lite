/**
 * Fetch guild members
 * @param {RestManager} rest - The REST manager instance
 * @param {string} guildId - The guild ID
 * @param {object} [options={}] - Fetch options
 * @param {number} [options.limit=1000] - Number of members to fetch
 * @param {string} [options.after] - Member ID to fetch after
 * @returns {Promise<Array>} Array of member data
 */
async function fetchGuildMembers(rest, guildId, options = {}) {
  const query = new URLSearchParams(options).toString();
  return await rest.request(`/guilds/${guildId}/members?${query}`, {
    method: "GET",
  });
}

module.exports = fetchGuildMembers;
