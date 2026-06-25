/**
 * Represents an attachment in a message
 */
class MessageAttachment {
  /**
   * Create a new MessageAttachment instance
   * @param {Buffer|string|ArrayBuffer} data - File data buffer or string
   * @param {string} name - Filename
   * @param {string|null} [description=null] - Description of the attachment
   */
  constructor(data, name, description = null) {
    this.data = data;
    this.name = name;
    this.description = description;
  }
}

module.exports = MessageAttachment;
