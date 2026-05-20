# ClientUser

Represents the authenticated Discord user.

This class extends [User](User.md) and is exposed as `client.user` after the client is ready.

## Constructor

```javascript
// ClientUser instances are created internally by the Client
```

You normally do not create this class directly.

## Methods

### `setPresence(presence)`

Sets the authenticated user's presence.

**Parameters:**

- `presence` (object) - Presence payload
  - `status` (string) - `online`, `idle`, `dnd`, or `invisible`
  - `activities` (Array) - Activity payloads
  - `afk` (boolean) - Whether the user is AFK
  - `since` (number) - Unix timestamp for the presence update

**Example:**

```javascript
client.user.setPresence({
  status: "dnd",
  activities: [{ name: "Working", type: 0 }],
  afk: false,
});
```

### `setStatus(status)`

Convenience method for changing the user's status.

**Parameters:**

- `status` (string) - The new status

**Example:**

```javascript
client.user.setStatus("idle");
```

### `setActivity(activity)`

Sets the user's activity.

**Parameters:**

- `activity` (object|null) - Activity payload or null to clear the activity

**Example:**

```javascript
client.user.setActivity({ name: "Listening to music", type: 2 });
```

## Properties

ClientUser inherits all [User](User.md) properties, including `id`, `username`, `discriminator`, `avatar`, and DM helpers.

## Example

```javascript
client.on("ready", () => {
  client.user.setStatus("idle");
  client.user.setActivity({ name: "discord-self-lite", type: 0 });
});
```
