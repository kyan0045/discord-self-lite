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
    typeof payload === "string" ? { content: payload } : { ...payload };

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
