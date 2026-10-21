# RestManager Class

The REST transport used by `Client`. Most users never construct this class
directly. It is exported so an application can subclass it and pass the class to
`new Client({ restClass })` when it needs transport policy such as a send queue.

## Constructor

```javascript
const { RestManager } = require("discord-self-lite");

const rest = new RestManager(token, 9);
```

**Parameters:**

- `token` (string) - Discord token
- `apiVersion` (number, optional) - Discord API version, defaults to `9`

## Methods

### `request(endpoint, options)`

Queues an API request and resolves with the response body, or `null` for a
`204 No Content` response.

**Parameters:**

- `endpoint` (string) - API path, for example `/channels/123/messages`
- `options` (object, optional) - Fetch options such as `method`, `headers`,
  `body`, and `signal`

**Returns:** `Promise<object|null>`

Throws `RouteQueueFullError` when the route queue is full. Throws
`RestManagerDestroyedError` after `destroy()`.

### `sendMessage(channelId, payload)`

Sends a message. A subclass can override this method to add a queue around
`super.sendMessage(channelId, payload)`.

**Parameters:**

- `channelId` (string) - Target channel
- `payload` (string|object) - Message content or payload

**Returns:** `Promise<object|null>`

### `getRateLimitStatus(endpoint, method)`

Returns the current global and route rate limit state, including
`isGloballyLimited`, `globalReset`, `isRouteLimited`, `routeLimit.remaining`,
`routeLimit.reset`, `routeLimit.resetIn`, `routeQueueLength`, and
`isRouteProcessing`. Applications should use this method instead of reading
`rateLimits` or `globalRateLimit` directly.

**Parameters:**

- `endpoint` (string) - API path
- `method` (string, optional) - HTTP method, defaults to `GET`

**Returns:** `object`

### `destroy(reason)`

Stops the manager. In-flight requests are aborted, queued requests and pending
sleeps are rejected, and rate limit state is cleared. Calling `destroy()` again
has no effect. `Client.destroy()` calls this method for you.

**Parameters:**

- `reason` (Error, optional) - Error used to reject pending work. Defaults to
  `RestManagerDestroyedError`.

**Returns:** `void`

## Subclass Example

```javascript
const {
  Client,
  RestManager,
  RestManagerDestroyedError,
} = require("discord-self-lite");

class QueuedRestManager extends RestManager {
  constructor(token, apiVersion) {
    super(token, apiVersion);
    this.queue = [];
  }

  async sendMessage(channelId, payload) {
    if (this.destroyed) throw new RestManagerDestroyedError();

    // Add application-specific priority, deadlines, or pacing here, then call
    // the base implementation when it is time to send.
    return await super.sendMessage(channelId, payload);
  }
}

const client = new Client({ restClass: QueuedRestManager });
```

Keep application policy in the subclass. Do not patch the prototype and do not
read private fields from this class.
