# DiscordAPIError

Represents an error from the Discord API.

## Constructor

```javascript
throw new DiscordAPIError(message, status, path);
```

**Parameters:**

- `message` (string) - The error message
- `status` (number) - The HTTP status code of the response
- `path` (string) - The path of the API endpoint that was requested

## Properties

| Property  | Type   | Description                                      |
| --------- | ------ | ------------------------------------------------ |
| `name`    | string | Always "DiscordAPIError"                         |
| `message` | string | The error message from Discord                   |
| `status`  | number | HTTP status code (e.g., 400, 403, 404, 429, 500) |
| `path`    | string | The API endpoint path that caused the error      |

## Example

```javascript
try {
  await channel.send("Hello!");
} catch (error) {
  if (error instanceof DiscordAPIError) {
    console.log(`API Error: ${error.status} - ${error.message}`);
    console.log(`Endpoint: ${error.path}`);

    if (error.status === 403) {
      console.log("Permission denied!");
    } else if (error.status === 429) {
      console.log("Rate limited!");
    }
  }
}
```

## Common Status Codes

| Status Code | Meaning                                       |
| ----------- | --------------------------------------------- |
| 400         | Bad Request - Invalid data sent               |
| 401         | Unauthorized - Invalid or missing token       |
| 403         | Forbidden - Missing permissions               |
| 404         | Not Found - Resource doesn't exist            |
| 429         | Too Many Requests - Rate limited              |
| 500         | Internal Server Error - Discord server error  |
| 502         | Bad Gateway - Discord temporarily unavailable |

## Error Handling

````javascript
const { DiscordAPIError } = require('discord-self-lite');

client.on('error', (error) => {
  if (error instanceof DiscordAPIError) {
    // Handle API-specific errors
    switch (error.status) {
      case 429:
        console.log('Rate limited, backing off...');
        break;
      case 403:
        console.log('Missing permissions for operation');
        break;
      default:
        console.log(`API Error ${error.status}: ${error.message}`);
    }
  } else {
    // Handle other errors (WebSocket, network, etc.)
    console.error('Non-API error:', error);
  }
});
```
````
