/**
 * Represents an error from the Discord API.
 * @extends Error
 */
class DiscordAPIError extends Error {
  /**
   * Creates an instance of DiscordAPIError.
   * @param {string} message - The error message.
   * @param {number} status - The HTTP status code of the response.
   * @param {string} path - The path of the API endpoint that was requested.
   */
  constructor(message, status, path) {
    super(message);
    this.name = "DiscordAPIError";
    this.status = status;
    this.path = path;
  }
}

module.exports = DiscordAPIError;
