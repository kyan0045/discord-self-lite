/**
 * Thrown when a request is rejected before it is sent because the queue for
 * its route has reached the maximum length.
 * @extends Error
 */
class RouteQueueFullError extends Error {
  /**
   * Creates an instance of RouteQueueFullError.
   * @param {string} route - The route key whose queue is full.
   * @param {number} limit - The maximum queue length.
   */
  constructor(route, limit) {
    super(`Request queue full for route ${route} (${limit} requests)`);
    this.name = "RouteQueueFullError";
    this.code = "ROUTE_QUEUE_FULL";
    this.route = route;
    this.limit = limit;
  }
}

module.exports = RouteQueueFullError;
