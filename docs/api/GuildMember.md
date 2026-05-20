# GuildMember

Represents a member of a Discord guild (server).

## Constructor

```javascript
const member = new GuildMember(client, data, guild);
```

**Parameters:**

- `client` (Client) - The Discord client instance
- `data` (object) - Raw member data from Discord API
- `guild` (Guild) - The guild this member belongs to

## Properties

| Property      | Type        | Description                             |
| ------------- | ----------- | --------------------------------------- |
| `id`          | string      | The user ID of this member              |
| `user`        | object      | Raw user object                         |
| `nick`        | string      | The member's nickname (null if none)    |
| `roles`       | Array       | Array of role IDs this member has       |
| `joinedAt`    | string      | ISO timestamp of when the member joined |
| `permissions` | Permissions | Calculated permissions bitfield         |
| `guild`       | Guild       | The guild this member belongs to        |

## Getters

### isClient

Check if this member represents the logged-in client user.

```javascript
if (member.isClient) {
  console.log("This is me!");
}
```

**Returns:** boolean

### displayName

Get the member's display name (nickname if set, otherwise username).

```javascript
console.log(`Display name: ${member.displayName}`);
```

**Returns:** string

### permissions

Get the member's calculated permissions in the guild.

```javascript
const perms = member.permissions;

// Check specific permissions
if (perms.has("ADMINISTRATOR")) {
  console.log("Member is admin!");
}

if (perms.has(["MANAGE_MESSAGES", "KICK_MEMBERS"])) {
  console.log("Member can moderate!");
}
```

**Returns:** Permissions - Bitfield of member permissions

## Methods

### hasPermission(permissions)

Check if the member has specific permissions.

```javascript
// Note: Currently simplified implementation
const canManage = member.hasPermission(["MANAGE_MESSAGES"]);
```

**Parameters:**

- `permissions` (Array<string>) - Permission flags to check

**Returns:** boolean - True if member has all specified permissions

**Note:** This method is currently a simplified implementation and always returns true. Full permission checking is planned for future updates.

## Permission Calculation

Member permissions are calculated by combining:

1. **Guild Owner**: If the member is the guild owner, they have all permissions
2. **@everyone Role**: Base permissions from the @everyone role
3. **Member Roles**: Permissions from all roles assigned to the member

```javascript
// Example permission checking
const member = guild.members.me;

if (member.permissions.has("ADMINISTRATOR")) {
  // Member has admin permissions
}

if (member.permissions.has(["SEND_MESSAGES", "READ_MESSAGE_HISTORY"])) {
  // Member can send messages and read history
}

// Check if missing certain permissions
const missing = member.permissions.missing(["BAN_MEMBERS", "KICK_MEMBERS"]);
if (missing.length > 0) {
  console.log(`Missing permissions: ${missing.join(", ")}`);
}
```

## Example

````javascript
// Get a member from a guild
const member = guild.members.get("123456789012345678");

// Check if member is the client
if (member.isClient) {
  console.log("Found myself in the guild!");
}

// Display member info
console.log(`${member.displayName} joined ${member.joinedAt}`);
console.log(`Roles: ${member.roles.length}`);

// Check permissions
if (member.permissions.has('MANAGE_GUILD')) {
  console.log("Can manage this guild");
}

// Access user information
console.log(`Username: ${member.user.username}`);
console.log(`Avatar: ${member.user.avatar}`);
```
````
