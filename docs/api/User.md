# User

Represents a Discord user.

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

### setPresence(presence)

Set the user's presence/status.

```javascript
user.setPresence({
  status: "dnd",
  activities: [
    {
      name: "Playing Game",
      type: 0,
    },
  ],
  afk: false,
});
```

**Parameters:**

- `presence` (object) - Presence data
  - `status` (string) - Status: 'online', 'idle', 'dnd', 'invisible'
  - `activities` (Array) - Array of activity objects
  - `afk` (boolean) - Whether the user is AFK
  - `since` (number) - Unix timestamp of when the status was set

### setStatus(status)

Set the user's status (convenience method).

```javascript
user.setStatus("online");
user.setStatus("idle");
user.setStatus("dnd");
user.setStatus("invisible");
```

**Parameters:**

- `status` (string) - Status: 'online', 'idle', 'dnd', 'invisible'

### setActivity(activity)

Set the user's current activity.

```javascript
// Playing a game
user.setActivity({
  name: "Minecraft",
  type: 0,
});

// Streaming
user.setActivity({
  name: "My Stream",
  type: 1,
  url: "https://twitch.tv/username",
});

// Listening to music
user.setActivity({
  name: "Music",
  type: 2,
});

// Watching something
user.setActivity({
  name: "YouTube",
  type: 3,
});

// Competing
user.setActivity({
  name: "Tournament",
  type: 5,
});

// Clear activity
user.setActivity(null);
```

**Parameters:**

- `activity` (object|null) - Activity data or null to clear
  - `name` (string) - Activity name
  - `type` (number) - Activity type:
    - `0` - Playing
    - `1` - Streaming
    - `2` - Listening
    - `3` - Watching
    - `5` - Competing
  - `url` (string) - Stream URL (required for type 1)

## Activity Types

| Type | Name      | Description                        |
| ---- | --------- | ---------------------------------- |
| 0    | Playing   | "Playing Minecraft"                |
| 1    | Streaming | "Streaming My Game" (requires URL) |
| 2    | Listening | "Listening to Spotify"             |
| 3    | Watching  | "Watching YouTube"                 |
| 5    | Competing | "Competing in Tournament"          |

## Example

````javascript
// Access the client user
const user = client.user;

// Set status to Do Not Disturb
user.setStatus("dnd");

// Set a custom activity
user.setActivity({
  name: "Developing Bots",
  type: 0 // Playing
});

// Set streaming activity
user.setActivity({
  name: "Live Coding",
  type: 1,
  url: "https://twitch.tv/developer"
});

// Clear activity
user.setActivity(null);

// Check user properties
console.log(`Username: ${user.username}`);
console.log(`Discriminator: ${user.discriminator}`);
console.log(`Avatar: ${user.avatar}`);
console.log(`Is bot: ${user.bot}`);
```
````
