# Changelog

All notable changes to discord-self-lite will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Release dates are written as `DD-MM-YYYY`, not the ISO 8601 `YYYY-MM-DD` format
specified by Keep a Changelog.

## [Unreleased]

## [0.2.0] - 19-10-2026

### Added

- **Gateway Cache Population**: `GUILD_CREATE` channels and active threads are cached, along with `READY` private and group DM channels, so `Message.channel` resolves without a REST call
- **Cache Invalidation**: `CHANNEL_*`, `THREAD_*`, `GUILD_UPDATE` and `GUILD_DELETE` update the caches and emit matching events, with `GUILD_DELETE` keeping cached data when `unavailable` is true
- **DiscordAPIError Code**: Exposes the numeric Discord error code (for example `50013`) alongside `fullError`
- **RouteQueueFullError**: New exported error with `code: "ROUTE_QUEUE_FULL"`, thrown when a request is rejected before sending because its route queue is full
- **RestManager Export and restClass**: `RestManager` is exported from the package root, and `new Client({ restClass })` accepts a subclass for transport policy such as a send queue
- **REST Shutdown**: New `RestManager.destroy(reason)` aborts in-flight requests, rejects queued requests and pending sleeps, and clears rate limit state; `Client.destroy(reason)` calls it, with pending work rejected by the supplied reason or `RestManagerDestroyedError` (`REST_MANAGER_DESTROYED`)

### Changed

- **Breaking**: `RestManager.request()` rejects with `RouteQueueFullError` instead of resolving `null` when the route queue is full; `null` now only means `204 No Content`

## [0.1.19] - 22-07-2026

### Added

- **Gateway Lifecycle Events**: New `reconnecting`, `resumed` and `reidentified` events, with `ready` emitted once per client

### Changed

- **Reconnect Handling**: Resumes the existing gateway session instead of logging in again, with exponential backoff up to five attempts

## [0.1.18] - 21-07-2026

### Changed

- **Rate Limiting**: Reworked REST rate limiting around a per-route request queue, with bucket reset waits and server-provided route and global retry timing
- **Request Queue**: Removed route suspension and the circuit breaker in favour of the per-route queue
- **Testing**: Added `npm test` using `node --test`

## [0.1.17] - 18-07-2026

### Added

- **Message Deletion**: New `message.delete()` and `RestManager.deleteMessage()` methods
- **CI**: New GitHub Actions workflow and `.gitattributes` for line ending normalization

### Changed

- **Dependencies**: Updated dev dependencies and added package health checks

### Fixed

- **Webhook Attachments**: Multipart payloads keep `attachments` and `files`

## [0.1.16] - 18-07-2026

### Changed

- **Channel.send()**: Sends the complete payload object by default, with defaults for `nonce`, `tts` and `flags`

## [0.1.15] - 25-06-2026

### Fixed

- **fetchMessages**: `Channel.fetchMessages()` and `Client.fetchMessages()` return `Message` instances
- **Reactions**: `react()` accepts an emoji object as well as a string

## [0.1.14] - 25-06-2026

### Added

- **Message Attachments**: New `MessageAttachment` class and multipart uploads through `sendMessage()` and `WebhookClient`

## [0.1.13] - 25-06-2026

### Added

- **Webhook Credentials**: `WebhookClient` accepts a URL, an `{ id, token }` object, or separate ID and token arguments
- **WebhookClient Documentation**: Added the API reference

### Fixed

- **Button Clicks**: `Message.guildId` falls back to the cached channel so interactions carry the guild ID

## [0.1.12] - 19-05-2026

### Changed

- **camelCase Fields**: `Message.components` and `Message.embeds` are converted to camelCase, matching the rest of the class
- **fetchMessage**: Fetches with a `limit=1&around=` query and throws `DiscordAPIError` 10008 when the message is missing

## [0.1.11] - 19-05-2026

### Added

- **Message URLs**: `Message.url` is generated from the guild, channel and message IDs

### Changed

- **Login**: `login()` resolves on `ready` and rejects on `error`; removed the unused `WebSocketError` class

### Fixed

- **Empty Responses**: `Channel.send()` returns `null` instead of constructing a message from an empty response
- **Missing Permissions**: 50013 responses are not retried
- **429 Timing**: Route suspensions use the response `retry_after` instead of a fixed two minutes

## [0.1.10] - 16-05-2026

### Added

- **Resolve Helpers**: New `client.resolveChannel()`, `client.resolveGuild()` and `client.resolveUser()` methods that return cached objects and fetch on a miss

## [0.1.9] - 13-05-2026

### Added

- **Webhook Management**: New `Channel.fetchWebhooks()` and `Channel.createWebhook(name, options)` methods for webhook operations
- **ClientUser Class**: New authenticated user class with presence management methods:
  - `setPresence(presence)` - Set full presence payload (status, activities, afk)
  - `setStatus(status)` - Convenience method for status-only updates
  - `setActivity(activity)` - Set or clear current activity
- **User Caching**: Client-level user caching with `client.getUser(userId)` (lazy load) and `client.fetchUser(userId)` (fresh API call)
- **DM Helpers**: New user methods for direct messaging:
  - `user.createDM()` - Create new DM channel
  - `user.getDMChannel()` - Get or create DM channel
  - `user.send(payload)` - Send direct message
- **Message Enhancement**: New message methods and properties:
  - `message.edit(payload)` - Edit an existing message
  - `message.reference` - Getter for referenced message (if available in message object)
  - `message.fetchReference()` - Asynchronously fetch referenced message
- **Channel Helpers**: Additional channel utility methods:
  - `channel.getGuild()` - Get containing guild (cached)
  - `channel.fetchGuild()` - Fetch containing guild from API
  - `channel.permissionsFor(member)` - Calculate member permissions in channel
  - `channel.awaitMessage(options)` - Wait for next message matching filter
  - Channel type checkers: `isText()`, `isVoice()`, `isDM()`, `isCategory()`, `isGroupDM()`, `isThread()`

### Changed

- **Error Handling**: Simplified error payload handling with enhanced `DiscordAPIError.fullError` property for richer error context

## [0.1.8] - 2025-10-14

### Added

- **Advanced Rate Limiting**: New rate limiting infrastructure with intelligent request management:
  - Route suspension system for 429 (rate limit) responses
  - Circuit breaker pattern with 2-minute suspension on consecutive rate limits
  - Aggressive immediate suspension strategy for proactive rate limit handling
  - Queue-based request isolation per route

## [0.1.7] - 2025-10-13

### Added

- **Comprehensive API Documentation**: Added documentation for all missing classes:
  - `Guild` - Server/guild management and member access
  - `GuildMember` - Guild member representation with permissions
  - `User` - Discord user representation with presence/status methods
  - `Permissions` - Complete Discord permission system with bitfield operations
  - `BitField` - Base bitfield class for permission handling
  - `DiscordAPIError` - API error handling with status codes and paths
  - `WebSocketError` - WebSocket connection error handling
- **Guild.members.me Property**: Direct access to the client user as a guild member
- **Permission Calculation**: Automatic permission calculation from roles with BigInt support
- **User Presence Management**: Set status, activities, and presence through User class
- **Enhanced Error Classes**: Proper error handling for API and WebSocket errors
- **Channel Message Handling**: Enhanced channel operations with message collection utilities
- **Safe BigInt Conversion**: Improved BigInt handling for Discord permission calculations
- **Webhook Color Processing**: Automatic color conversion for webhook embeds

### Changed

- **Documentation Structure**: Updated API reference to include all available classes
- **Version Consistency**: Updated version numbers across documentation and code
- **Channel Permissions**: Enhanced permission checking with channel overwrites support

### Fixed

- **Permission BitField Operations**: Fixed BigInt handling for Discord permission calculations
- **Documentation Coverage**: All exported and internal classes now have comprehensive documentation
- **Webhook Embed Colors**: Fixed color format conversion issues

## [0.1.6] - 2025-10-13

### Added

- **awaitMessage Method**: Advanced message waiting functionality with filtering and timeout support
- **Enhanced Rate Limit Logging**: Route-specific rate limit information now includes both normalized route keys and actual endpoints for better debugging
- **Rate Limit Logging Example**: New example demonstrating enhanced rate limit logging capabilities
- **Channel API Documentation**: Comprehensive documentation for Channel class methods

### Changed

- **Rate Limit Logging Format**: Improved logging to show both route patterns and actual endpoints

### Fixed

- **Rate Limit Handling**: Enhanced REST manager rate limit processing and logging

## [0.1.5] - 2025-10-13

### Added

- **Permissions System**: Complete Discord permission bitfield implementation with all 51 permission flags
- **BitField Base Class**: Foundation class for handling bitfield operations with BigInt support
- **Permission Checking**: Advanced permission validation with administrator override handling
- **Channel Permissions**: Permission checking with channel-specific overwrites
- **Guild Member Permissions**: Automatic permission calculation from guild roles

### Changed

- **Client Exports**: Added Permissions and BitField to main package exports
- **Permission Architecture**: Implemented proper permission hierarchy and checking

## [0.1.4] - 2025-10-13

### Added

- **Guild Member Management**: Complete guild member fetching and caching system
- **Guild.members.me Property**: Direct access to client user as guild member
- **Member Fetching**: Bulk member fetching with pagination support
- **WebSocket Member Events**: READY and GUILD_MEMBER_UPDATE event handling
- **REST Member Methods**: fetchGuildMember and fetchGuildMembers API methods

### Changed

- **Guild Class**: Enhanced with member management and caching
- **Client Member Access**: Improved member access patterns

## [0.1.3] - 2025-10-13

### Added

- **User Class**: Complete user representation with presence management
- **Presence/Status Management**: Set user status, activities, and presence updates
- **Activity Types**: Support for Playing, Streaming, Listening, Watching, and Competing activities
- **WebSocket Presence Updates**: Real-time presence synchronization
- **User Property Access**: Avatar, banner, and profile information handling

### Changed

- **Client User Access**: Enhanced client.user property with full User class functionality
- **Documentation**: Updated examples and documentation for user management

## [0.1.2] - 2025-10-13

### Added

- **Guild Channel Fetching**: Fetch all channels for a guild with caching
- **Channel Verification**: Ensure channels belong to correct guilds
- **Guild Icon/Banner URLs**: Generate CDN URLs for guild assets
- **Message Enhancement**: Improved message property handling
- **REST Manager Updates**: Enhanced API request handling

### Changed

- **Guild Functionality**: Expanded guild operations and data access
- **Channel Management**: Better channel caching and retrieval

## [0.1.1] - 2025-10-13

### Added

- **Client User Properties**: Enhanced client.user access with user information
- **Button Interaction Fixes**: Improved button clicking functionality
- **WebSocket User Events**: Better user event handling

### Changed

- **Client Architecture**: Enhanced user property management
- **README Updates**: Added version badges and download information

## [0.1.0] - 2025-09-13

### Added

- 🎉 **Initial Release**
- ✅ **Core Discord Client** with WebSocket connection
- ✅ **REST API Integration** using built-in Node.js fetch
- ✅ **Message Handling** with reply, react, and interaction methods
- ✅ **Button Clicking** with support for indices and custom IDs
- ✅ **Channel Operations** including message fetching and sending
- ✅ **WebhookClient** for Discord webhook messaging
- ✅ **Guild Support** with fetching and management
- ✅ **Dynamic Property Assignment** from Discord API responses
- ✅ **Comprehensive JSDoc Documentation** throughout codebase
- ✅ **Zero External Dependencies** (except ws for WebSocket)

### Features

#### Client Class

- `login(token)` - Authenticate with Discord
- `fetchChannel(id)` - Fetch channels from API
- `fetchMessage(channelId, messageId)` - Fetch specific messages
- `fetchGuild(id)` - Fetch guild information
- Event handling for messages, guilds, and connections

#### Message Class

- `reply(content)` - Reply to messages
- `react(emoji)` - Add reactions
- `clickButton(index)` - Interact with message buttons

#### Channel Class

- `send(content)` - Send messages
- `fetchMessages(options)` - Retrieve message history

#### WebhookClient Class

- `send(content)` - Send webhook messages
- `send(embed)` - Send rich embeds
- Message editing and deletion support

#### Guild Class

- Basic guild information and channel access
- Guild member and role management foundation

[Unreleased]: https://github.com/kyan0045/discord-self-lite/compare/7c7a54cb1cdfce4457ae7fe558d37f85db3151bf...HEAD
[0.2.0]: https://www.npmjs.com/package/discord-self-lite/v/0.2.0
[0.1.19]: https://www.npmjs.com/package/discord-self-lite/v/0.1.19
[0.1.18]: https://www.npmjs.com/package/discord-self-lite/v/0.1.18
[0.1.17]: https://www.npmjs.com/package/discord-self-lite/v/0.1.17
[0.1.16]: https://www.npmjs.com/package/discord-self-lite/v/0.1.16
[0.1.15]: https://www.npmjs.com/package/discord-self-lite/v/0.1.15
[0.1.14]: https://www.npmjs.com/package/discord-self-lite/v/0.1.14
[0.1.13]: https://www.npmjs.com/package/discord-self-lite/v/0.1.13
[0.1.12]: https://www.npmjs.com/package/discord-self-lite/v/0.1.12
[0.1.11]: https://www.npmjs.com/package/discord-self-lite/v/0.1.11
[0.1.10]: https://www.npmjs.com/package/discord-self-lite/v/0.1.10
[0.1.9]: https://www.npmjs.com/package/discord-self-lite/v/0.1.9
[0.1.8]: https://www.npmjs.com/package/discord-self-lite/v/0.1.8
[0.1.7]: https://www.npmjs.com/package/discord-self-lite/v/0.1.7
[0.1.6]: https://www.npmjs.com/package/discord-self-lite/v/0.1.6
[0.1.5]: https://www.npmjs.com/package/discord-self-lite/v/0.1.5
[0.1.4]: https://www.npmjs.com/package/discord-self-lite/v/0.1.4
[0.1.3]: https://www.npmjs.com/package/discord-self-lite/v/0.1.3
[0.1.2]: https://www.npmjs.com/package/discord-self-lite/v/0.1.2
[0.1.1]: https://www.npmjs.com/package/discord-self-lite/v/0.1.1
[0.1.0]: https://www.npmjs.com/package/discord-self-lite/v/0.1.0
