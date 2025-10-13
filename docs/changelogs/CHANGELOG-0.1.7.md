# Changelog

All notable changes to discord-self-lite will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
