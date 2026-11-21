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
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  const endpoint = query
    ? `/guilds/${guildId}/members?${query}`
    : `/guilds/${guildId}/members`;
  return await rest.request(endpoint, {
    method: "GET",
  });
}

module.exports = fetchGuildMembers;
