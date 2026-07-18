/**
 * Send a message to a Discord channel
 * @param {RestManager} rest - The REST manager instance
 * @param {string} channelId - The channel ID to send to
 * @param {string|object} payload - Message content or payload object
 * @returns {Promise<object>} The sent message data
 */
const DISCORD_EPOCH = 1420070400000n;
let nonceIncrement = 0n;

function generateNonce() {
  nonceIncrement = (nonceIncrement + 1n) & 0xfffn;
  return (
    ((BigInt(Date.now()) - DISCORD_EPOCH) << 22n) |
    nonceIncrement
  ).toString();
}

async function sendMessage(rest, channelId, payload) {
  const payloadOverrides =
    typeof payload === "string" ? { content: payload } : { ...payload };
  const messagePayload = {
    mobile_network_type: "unknown",
    content: undefined,
    nonce: generateNonce(),
    tts: false,
    flags: 0,
    ...payloadOverrides,
  };

  const filesToUpload = [];
  const keepAttachments = [];

  const rawAttachments = messagePayload.attachments || [];
  if (Array.isArray(rawAttachments)) {
    for (const att of rawAttachments) {
      if (
        att &&
        typeof att === "object" &&
        (att.data !== undefined || att.attachment !== undefined)
      ) {
        filesToUpload.push(att);
      } else {
        keepAttachments.push(att);
      }
    }
  }

  const rawFiles = messagePayload.files || [];
  if (Array.isArray(rawFiles)) {
    for (const file of rawFiles) {
      if (
        file &&
        typeof file === "object" &&
        (file.data !== undefined || file.attachment !== undefined)
      ) {
        filesToUpload.push(file);
      } else if (file) {
        filesToUpload.push({ data: file });
      }
    }
  }

  if (filesToUpload.length > 0) {
    const formData = new FormData();

    const uploadedAttachmentsMetadata = filesToUpload.map((file, index) => {
      const filename = file.name || `file_${index}`;
      const description = file.description || null;
      return {
        id: index,
        filename,
        description,
      };
    });

    messagePayload.attachments = [
      ...keepAttachments,
      ...uploadedAttachmentsMetadata,
    ];

    delete messagePayload.files;

    formData.append("payload_json", JSON.stringify(messagePayload));

    filesToUpload.forEach((file, index) => {
      const fileData = file.data || file.attachment;
      const filename = file.name || `file_${index}`;
      const blob = new Blob([fileData]);
      formData.append(`files[${index}]`, blob, filename);
    });

    return await rest.request(`/channels/${channelId}/messages`, {
      method: "POST",
      body: formData,
    });
  }

  return await rest.request(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify(messagePayload),
  });
}

module.exports = sendMessage;
