# WebSocketError

Represents an error related to the WebSocket connection to Discord.

## Constructor

```javascript
throw new WebSocketError(message, code);
```

**Parameters:**

- `message` (string) - The error message
- `code` (number) - The WebSocket close code (optional)

## Properties

| Property  | Type   | Description                         |
| --------- | ------ | ----------------------------------- |
| `name`    | string | Always "WebSocketError"             |
| `message` | string | The error message                   |
| `code`    | number | WebSocket close code (if available) |

## Example

```javascript
client.on("error", (error) => {
  if (error instanceof WebSocketError) {
    console.log(`WebSocket Error: ${error.message}`);
    if (error.code) {
      console.log(`Close code: ${error.code}`);
    }

    // Handle specific close codes
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

## Error Handling

````javascript
const { WebSocketError } = require('discord-self-lite');

client.on('error', (error) => {
  if (error instanceof WebSocketError) {
    console.log('WebSocket connection error occurred');

    // Attempt reconnection for certain errors
    if ([4000, 4008, 4009].includes(error.code)) {
      console.log('Attempting to reconnect...');
      setTimeout(() => client.login(), 5000);
    } else {
      console.log('Fatal error, not reconnecting');
    }
  }
});

// Handle connection close events
client.on('disconnect', (code, reason) => {
  console.log(`Disconnected with code ${code}: ${reason}`);
});
```
````
