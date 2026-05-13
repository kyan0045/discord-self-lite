# User

Represents a Discord user.

The authenticated user is exposed as [ClientUser](ClientUser.md) and adds presence/status helpers on top of this base shape.

## Constructor

```javascript
const user = new User(client, data);
```

**Parameters:**

- `client` (Client) - The Discord client instance
- `data` (object) - Raw user data from Discord API

## Properties

| Property        | Type    | Description                                 |
| --------------- | ------- | ------------------------------------------- |
| `id`            | string  | The user ID                                 |
| `username`      | string  | The user's username                         |
| `discriminator` | string  | The user's discriminator (4-digit number)   |
| `avatar`        | string  | The user's avatar hash                      |
| `bot`           | boolean | Whether the user is a bot                   |
| `system`        | boolean | Whether the user is a system user           |
| `mfaEnabled`    | boolean | Whether the user has MFA enabled            |
| `banner`        | string  | The user's banner hash                      |
| `accentColor`   | number  | The user's banner color                     |
| `locale`        | string  | The user's locale                           |
| `verified`      | boolean | Whether the user's email is verified        |
| `email`         | string  | The user's email (only for the client user) |
| `flags`         | number  | The user's flags                            |
| `premiumType`   | number  | The user's premium type                     |
| `publicFlags`   | number  | The user's public flags                     |

## Methods

### `createDM()`

Creates a direct message channel with this user.

**Returns:** Promise<Channel> - The DM channel

**Example:**

```javascript
const dm = await user.createDM();
await dm.send("Hello!");
```

### `getDMChannel()`

Gets the existing DM channel or creates one if needed.

**Returns:** Promise<Channel> - The DM channel

**Example:**

```javascript
const dm = await user.getDMChannel();
```

### `send(payload)`

Sends a direct message to the user.

**Parameters:**

- `payload` (string|object) - Message content or payload object

**Returns:** Promise<Message> - The sent message

**Example:**

```javascript
await user.send("Hello from a DM!");
```

## Example

```javascript
// Regular users are exposed as User instances
const user = client.getUser("123456789012345678");

// Open a DM and send a message
const dm = await user.getDMChannel();
await dm.send("Hello!");

// Or send directly through the user helper
await user.send("Hello again!");
```
