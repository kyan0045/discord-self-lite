/**
 * Create a DM channel with a recipient
 * @param {RestManager} rest
 * @param {string} recipientId
 */
async function createDM(rest, recipientId) {
  return await rest.request(`/users/@me/channels`, {
    method: "POST",
    body: JSON.stringify({ recipient_id: recipientId }),
  });
}

module.exports = createDM;
