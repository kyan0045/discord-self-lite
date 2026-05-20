/**
 * Fetch a user by ID
 * @param {RestManager} rest
 * @param {string} userId
 */
async function fetchUser(rest, userId) {
  return await rest.request(`/users/${userId}`, {
    method: "GET",
  });
}

module.exports = fetchUser;
