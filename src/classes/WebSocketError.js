/**
 * Represents an error related to the WebSocket connection
 * @extends Error
 */
class WebSocketError extends Error {
  /**
   * Create a new WebSocketError
   * @param {string} message - The error message
   * @param {number} [code] - The WebSocket close code
   */
  constructor(message, code) {
    super(message);
    this.name = "WebSocketError";
    this.code = code;
  }
}

module.exports = WebSocketError;
