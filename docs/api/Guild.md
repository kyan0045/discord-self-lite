# Guild

Represents a Discord guild (server).

## Constructor

```javascript
const guild = new Guild(client, rest, data);
```

**Parameters:**

- `client` (Client) - The Discord client instance
- `rest` (RestManager) - The REST API manager
- `data` (string|object) - Guild ID string or full guild data object

## Properties

| Property      | Type   | Description                                           |
| ------------- | ------ | ----------------------------------------------------- |
| `id`          | string | The guild ID                                          |
| `name`        | string | The guild name                                        |
| `icon`        | string | The guild icon hash                                   |
| `banner`      | string | The guild banner hash                                 |
| `description` | string | The guild description                                 |
| `ownerId`     | string | The guild owner's user ID                             |
| `roles`       | Array  | Array of guild roles                                  |
| `members`     | Object | Members collection with Map methods and `me` property |

## Methods

### getChannel(channelId)

Get a channel from this guild's cache.

```javascript
const channel = guild.getChannel("123456789012345678");
```

**Parameters:**

- `channelId` (string) - The channel ID

**Returns:** Channel instance or null if not cached

### fetchChannel(channelId)

Fetch a channel from the API and verify it belongs to this guild.

```javascript
const channel = await guild.fetchChannel("123456789012345678");
```

**Parameters:**

- `channelId` (string) - The channel ID

**Returns:** Promise<Channel>

**Throws:** Error if channel doesn't belong to this guild

### getChannels()

Get all cached channels that belong to this guild.

```javascript
const channels = guild.getChannels();
```

**Returns:** Array<Channel>

### fetchChannels()

Fetch all channels for this guild from the API.

```javascript
const channels = await guild.fetchChannels();
```

**Returns:** Promise<Array<Channel>>

### getIconURL([options])

Get the guild's icon URL.

```javascript
const iconURL = guild.getIconURL({ size: 256, format: "png" });
```

**Parameters:**

- `options` (object) - Icon options
  - `size` (number) - Icon size (default: 512)
  - `format` (string) - Icon format: 'png', 'jpg', 'webp', 'gif' (default: 'png')

**Returns:** string|null - The icon URL or null if no icon

### getBannerURL([options])

Get the guild's banner URL.

```javascript
const bannerURL = guild.getBannerURL({ size: 1024, format: "png" });
```

**Parameters:**

- `options` (object) - Banner options
  - `size` (number) - Banner size (default: 512)
  - `format` (string) - Banner format: 'png', 'jpg', 'webp', 'gif' (default: 'png')

**Returns:** string|null - The banner URL or null if no banner

### fetchMembers([options])

Fetch members for this guild.

```javascript
const members = await guild.fetchMembers({ limit: 100 });
```

**Parameters:**

- `options` (object) - Fetch options
  - `limit` (number) - Number of members to fetch (default: 1000)
  - `after` (string) - Member ID to fetch after

**Returns:** Promise<Array<GuildMember>>

## Members Collection

The `members` property provides access to guild members with special handling:

```javascript
// Access members like a Map
const member = guild.members.get("123456789012345678");

// Special 'me' property for the client user
const me = guild.members.me; // GuildMember instance of the logged-in user

// Iterate over members
for (const [id, member] of guild.members) {
  console.log(`${member.user.username}: ${member.roles.length} roles`);
}
```

## Example

````javascript
// Get guild from client
const guild = client.guilds.get("123456789012345678");

// Fetch channels
const channels = await guild.fetchChannels();

// Get text channels
const textChannels = channels.filter(ch => ch.type === 0);

// Send message to first text channel
if (textChannels.length > 0) {
  await textChannels[0].send("Hello from guild!");
}

// Access client member
const myMember = guild.members.me;
console.log(`My roles: ${myMember.roles.length}`);
```
````
