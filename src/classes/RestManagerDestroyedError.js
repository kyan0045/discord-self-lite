/**
 * Thrown when a REST request is rejected because its RestManager was destroyed.
 * The request was not sent, and any request still in flight was aborted.
 * @extends Error
 */
class RestManagerDestroyedError extends Error {
  /**
   * Creates an instance of RestManagerDestroyedError.
   */
  constructor() {
    super("RestManager has been destroyed");
    this.name = "RestManagerDestroyedError";
    this.code = "REST_MANAGER_DESTROYED";
  }
}

module.exports = RestManagerDestroyedError;
