# RestManagerDestroyedError

Thrown when REST work is rejected because its `RestManager` was destroyed by
`Client.destroy()` or `RestManager.destroy()`. Work that was in flight was
aborted and work still queued was never sent.

Extends `Error`.

## Properties

| Property  | Type   | Description                          |
| --------- | ------ | ------------------------------------ |
| `name`    | string | Always `"RestManagerDestroyedError"` |
| `code`    | string | Always `"REST_MANAGER_DESTROYED"`    |
| `message` | string | `"RestManager has been destroyed"`   |

## Example

```javascript
const { RestManagerDestroyedError } = require("discord-self-lite");

try {
  await channel.send("Hello!");
} catch (error) {
  if (error instanceof RestManagerDestroyedError) {
    // Shutdown is expected; the message was not sent.
  } else {
    throw error;
  }
}
```

## Custom reasons

`destroy(reason)` rejects pending work with the supplied error instead of
`RestManagerDestroyedError`. This lets an application keep one shutdown error
across its own queue and the REST manager:

```javascript
const stopped = Object.assign(new Error("Client has been stopped."), {
  code: "CLIENT_STOPPED",
});

client.destroy(stopped);
```
