# RouteQueueFullError

Thrown by the REST manager when a request is rejected before it is sent because
the queue for its route has reached the maximum length (50 requests). The
request was **not** sent to Discord, so retrying cannot duplicate it.

Extends `Error`.

## Properties

| Property | Type   | Description                           |
| -------- | ------ | ------------------------------------- |
| `name`   | string | Always `"RouteQueueFullError"`        |
| `code`   | string | Always `"ROUTE_QUEUE_FULL"`           |
| `route`  | string | The route key whose queue was full    |
| `limit`  | number | Maximum queue length (currently `50`) |

## Example

```javascript
const { RouteQueueFullError } = require("discord-self-lite");

try {
  await channel.send("Hello!");
} catch (error) {
  if (error instanceof RouteQueueFullError) {
    console.log(`Dropped before sending on ${error.route}; safe to retry`);
  } else {
    throw error;
  }
}
```

## Notes

`RestManager.request()` still resolves `null` for a `204 No Content` response.
This error is only for a request that never left the queue.
