# Permissions

Data structure that makes it easy to interact with a permission bitfield. All GuildMembers have a set of permissions in their guild, and each channel in the guild may also have PermissionOverwrites for the member that override their default permissions.

## Constructor

```javascript
const permissions = new Permissions(bits);
```

**Parameters:**

- `bits` (PermissionResolvable) - Permission bits to resolve

**PermissionResolvable types:**

- `string` - Permission flag name (e.g., 'ADMINISTRATOR')
- `bigint` - Raw permission bitfield
- `Permissions` - Another Permissions instance
- `Array` - Array of PermissionResolvable

## Properties

| Property   | Type   | Description                 |
| ---------- | ------ | --------------------------- |
| `bitfield` | bigint | The raw permission bitfield |

## Static Properties

### FLAGS

All available permission flags as bitfield values:

```javascript
Permissions.FLAGS.ADMINISTRATOR; // 1n << 3n
Permissions.FLAGS.MANAGE_GUILD; // 1n << 5n
Permissions.FLAGS.SEND_MESSAGES; // 1n << 11n
// ... etc
```

### ALL

Bitfield representing every permission combined.

```javascript
const allPerms = new Permissions(Permissions.ALL);
```

### DEFAULT

Bitfield representing the default permissions for users.

### STAGE_MODERATOR

Bitfield representing the permissions required for moderators of stage channels.

## Methods

### has(permission[, checkAdmin])

Checks whether the bitfield has a permission, or multiple permissions.

```javascript
const perms = member.permissions;

if (perms.has("ADMINISTRATOR")) {
  console.log("User is admin!");
}

if (perms.has(["SEND_MESSAGES", "READ_MESSAGE_HISTORY"])) {
  console.log("User can send messages and read history");
}
```

**Parameters:**

- `permission` (PermissionResolvable) - Permission(s) to check for
- `checkAdmin` (boolean) - Whether to allow administrator permission to override (default: true)

**Returns:** boolean

### any(permission[, checkAdmin])

Checks whether the bitfield has a permission, or any of multiple permissions.

```javascript
if (perms.any(["ADMINISTRATOR", "MANAGE_GUILD"])) {
  console.log("User has admin or manage server permissions");
}
```

**Parameters:**

- `permission` (PermissionResolvable) - Permission(s) to check for
- `checkAdmin` (boolean) - Whether to allow administrator permission to override (default: true)

**Returns:** boolean

### missing(bits[, checkAdmin])

Gets all given bits that are missing from the bitfield.

```javascript
const missing = perms.missing(["BAN_MEMBERS", "KICK_MEMBERS"]);
console.log(`Missing permissions: ${missing.join(", ")}`);
// Output: ["BAN_MEMBERS"] if user can kick but not ban
```

**Parameters:**

- `bits` (BitFieldResolvable) - Bit(s) to check for
- `checkAdmin` (boolean) - Whether to allow administrator permission to override (default: true)

**Returns:** Array<string> - Array of missing permission flag names

### toArray()

Gets an array of bitfield names based on the permissions available.

```javascript
const permArray = perms.toArray();
console.log(permArray);
// Output: ["SEND_MESSAGES", "READ_MESSAGE_HISTORY", "ADD_REACTIONS", ...]
```

**Returns:** Array<string> - Array of permission flag names

## Permission Flags

| Flag                                  | Value       | Description                                             |
| ------------------------------------- | ----------- | ------------------------------------------------------- |
| `CREATE_INSTANT_INVITE`               | `1n << 0n`  | Create invitations to the guild                         |
| `KICK_MEMBERS`                        | `1n << 1n`  | Kick members                                            |
| `BAN_MEMBERS`                         | `1n << 2n`  | Ban members                                             |
| `ADMINISTRATOR`                       | `1n << 3n`  | Implicitly has all permissions, bypasses overwrites     |
| `MANAGE_CHANNELS`                     | `1n << 4n`  | Edit and reorder channels                               |
| `MANAGE_GUILD`                        | `1n << 5n`  | Edit the guild information, region, etc.                |
| `ADD_REACTIONS`                       | `1n << 6n`  | Add new reactions to messages                           |
| `VIEW_AUDIT_LOG`                      | `1n << 7n`  | View audit log                                          |
| `PRIORITY_SPEAKER`                    | `1n << 8n`  | Priority speaker in voice channels                      |
| `STREAM`                              | `1n << 9n`  | Stream in voice channels                                |
| `VIEW_CHANNEL`                        | `1n << 10n` | View channels                                           |
| `SEND_MESSAGES`                       | `1n << 11n` | Send messages                                           |
| `SEND_TTS_MESSAGES`                   | `1n << 12n` | Send TTS messages                                       |
| `MANAGE_MESSAGES`                     | `1n << 13n` | Delete messages and reactions                           |
| `EMBED_LINKS`                         | `1n << 14n` | Links posted will have a preview embedded               |
| `ATTACH_FILES`                        | `1n << 15n` | Attach files                                            |
| `READ_MESSAGE_HISTORY`                | `1n << 16n` | View messages that were posted prior to opening Discord |
| `MENTION_EVERYONE`                    | `1n << 17n` | Mention @everyone, @here, and all roles                 |
| `USE_EXTERNAL_EMOJIS`                 | `1n << 18n` | Use emojis from different guilds                        |
| `VIEW_GUILD_INSIGHTS`                 | `1n << 19n` | View guild insights                                     |
| `CONNECT`                             | `1n << 20n` | Connect to a voice channel                              |
| `SPEAK`                               | `1n << 21n` | Speak in a voice channel                                |
| `MUTE_MEMBERS`                        | `1n << 22n` | Mute members across all voice channels                  |
| `DEAFEN_MEMBERS`                      | `1n << 23n` | Deafen members across all voice channels                |
| `MOVE_MEMBERS`                        | `1n << 24n` | Move members between voice channels                     |
| `USE_VAD`                             | `1n << 25n` | Use voice activity detection                            |
| `CHANGE_NICKNAME`                     | `1n << 26n` | Change own nickname                                     |
| `MANAGE_NICKNAMES`                    | `1n << 27n` | Change other members' nicknames                         |
| `MANAGE_ROLES`                        | `1n << 28n` | Manage roles                                            |
| `MANAGE_WEBHOOKS`                     | `1n << 29n` | Manage webhooks                                         |
| `MANAGE_EMOJIS_AND_STICKERS`          | `1n << 30n` | Manage emojis and stickers                              |
| `USE_APPLICATION_COMMANDS`            | `1n << 31n` | Use application commands                                |
| `REQUEST_TO_SPEAK`                    | `1n << 32n` | Request to speak in stage channels                      |
| `MANAGE_EVENTS`                       | `1n << 33n` | Manage events                                           |
| `MANAGE_THREADS`                      | `1n << 34n` | Manage threads                                          |
| `CREATE_PUBLIC_THREADS`               | `1n << 35n` | Create public threads                                   |
| `CREATE_PRIVATE_THREADS`              | `1n << 36n` | Create private threads                                  |
| `USE_EXTERNAL_STICKERS`               | `1n << 37n` | Use stickers from different guilds                      |
| `SEND_MESSAGES_IN_THREADS`            | `1n << 38n` | Send messages in threads                                |
| `START_EMBEDDED_ACTIVITIES`           | `1n << 39n` | Start embedded activities                               |
| `MODERATE_MEMBERS`                    | `1n << 40n` | Moderate members (timeout)                              |
| `VIEW_CREATOR_MONETIZATION_ANALYTICS` | `1n << 41n` | View creator monetization analytics                     |
| `USE_SOUNDBOARD`                      | `1n << 42n` | Use soundboard                                          |
| `CREATE_GUILD_EXPRESSIONS`            | `1n << 43n` | Create guild expressions                                |
| `CREATE_EVENTS`                       | `1n << 44n` | Create events                                           |
| `USE_EXTERNAL_SOUNDS`                 | `1n << 45n` | Use external sounds                                     |
| `SEND_VOICE_MESSAGES`                 | `1n << 46n` | Send voice messages                                     |
| `USE_CLYDE_AI`                        | `1n << 47n` | Use Clyde AI                                            |
| `SET_VOICE_CHANNEL_STATUS`            | `1n << 48n` | Set voice channel status                                |
| `SEND_POLLS`                          | `1n << 49n` | Send polls                                              |
| `USE_EXTERNAL_APPS`                   | `1n << 50n` | Use external apps                                       |

## Example

````javascript
// Get member permissions
const member = guild.members.me;
const perms = member.permissions;

// Check individual permissions
if (perms.has('ADMINISTRATOR')) {
  console.log('Member has administrator permissions');
}

// Check multiple permissions (all must be present)
if (perms.has(['MANAGE_MESSAGES', 'KICK_MEMBERS'])) {
  console.log('Member can moderate');
}

// Check if member has any of several permissions
if (perms.any(['ADMINISTRATOR', 'MANAGE_GUILD'])) {
  console.log('Member has admin or server management permissions');
}

// Get missing permissions
const required = ['BAN_MEMBERS', 'KICK_MEMBERS', 'MANAGE_MESSAGES'];
const missing = perms.missing(required);
if (missing.length > 0) {
  console.log(`Missing permissions: ${missing.join(', ')}`);
}

// Get all permission names the member has
const allPerms = perms.toArray();
console.log(`Member has ${allPerms.length} permissions`);

// Create permissions from flags
const modPerms = new Permissions(['MANAGE_MESSAGES', 'KICK_MEMBERS']);
const isMod = perms.has(modPerms);
```
````
