# Gateway & WebSocket Errors

Gateway and socket errors are emitted through `client.on("error", (error) => ...)`
as standard `Error` instances with extra gateway metadata.

## Properties

| Property  | Type           | Description                                                               |
| --------- | -------------- | ------------------------------------------------------------------------- |
| `name`    | string         | Error name (typically `"Error"`)                                          |
| `message` | string         | The error description                                                     |
| `fatal`   | boolean        | `true` for terminal gateway errors, `false` for recoverable socket errors |
| `code`    | number\|string | Gateway close code (e.g. `4004`, `4014`) or `"MAX_RECONNECTS"`            |

## Example

```javascript
client.on("error", (error) => {
  console.log(`Gateway Error: ${error.message}`);
  if (error.code) {
    console.log(`Code: ${error.code}`);
  }

  switch (error.code) {
    case 4004:
      console.log("Invalid token");
      break;
    case 4010:
      console.log("Invalid shard");
      break;
    case 4011:
      console.log("Sharding required");
      break;
  }

  if (error.fatal) {
    client.destroy();
  }
});
```

## Common Close Codes

| Close Code | Meaning               |
| ---------- | --------------------- |
| 4000       | Unknown error         |
| 4001       | Unknown opcode        |
| 4002       | Decode error          |
| 4003       | Not authenticated     |
| 4004       | Authentication failed |
| 4005       | Already authenticated |
| 4007       | Invalid seq           |
| 4008       | Rate limited          |
| 4009       | Session timeout       |
| 4010       | Invalid shard         |
| 4011       | Sharding required     |
| 4012       | Invalid API version   |
| 4013       | Invalid intent(s)     |
| 4014       | Disallowed intent(s)  |

## Error & Disconnection Handling

```javascript
const { Client } = require("discord-self-lite");

const client = new Client();

client.on("error", (error) => {
  if (error.fatal) {
    console.error("Fatal gateway error, not reconnecting:", error);
    client.destroy();
  } else {
    console.log("Recoverable socket error; gateway will reconnect:", error);
  }
});

// Handle connection close events
client.on("disconnected", (code, reason) => {
  console.log(`Disconnected with code ${code}: ${reason}`);
});
```
