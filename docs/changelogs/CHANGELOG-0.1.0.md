# Changelog

All notable changes to discord-self-lite will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive markdown documentation in `/docs` folder
- Complete API reference with examples
- Getting started guide
- Detailed examples for all features
- **Proper rate limiting** with 429 handling, retry logic, and queue management

### Changed

- Switched from JSDoc HTML to GitHub-friendly markdown documentation

### Fixed

- Rate limiting now properly handles Discord's rate limits with exponential backoff
- Global and route-specific rate limit tracking
- Queue-based request management to prevent overwhelming Discord API

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

#### Message Class

- `reply(content, options)` - Reply to messages with reference
- `react(emoji)` - Add reactions to messages
- `clickButton(identifier)` - Click buttons by index or custom ID
- Dynamic properties from Discord API data

#### Channel Class

- `send(content, options)` - Send messages to channels
- `fetchMessages(options)` - Retrieve message history
- `isText()`, `isDM()` - Channel type checking
- `getURL()` - Generate Discord channel URLs

#### WebhookClient Class

- `send(content, options)` - Flexible message sending
- `edit(messageId, content)` - Edit webhook messages
- `delete(messageId)` - Delete webhook messages
- `fetchMessage(messageId)` - Retrieve webhook messages
- `WebhookClient.createEmbed(data)` - Helper for embed creation
- `WebhookClient.parseURL(url)` - Parse webhook URLs

### Technical Details

- **Node.js 18+** compatibility with built-in fetch API
- **Discord API v9** for all endpoints
- **WebSocket Gateway** connection with proper heartbeat
- **Rate Limiting** basic implementation
- **Error Handling** throughout the library
- **Modular Architecture** with separate REST methods
- **Snake_case to camelCase** property conversion
- **Future-proof** dynamic property assignment

### Examples Included

- **Basic bot setup** with commands and reactions
- **Button interaction** handling with multiple approaches
- **Webhook messaging** with embeds and flexible formats
- **Message monitoring** and analytics
- **Error reporting** systems
- **Channel backup** utilities

### Development Features

- **Comprehensive documentation** with JSDoc comments
- **Example files** for Client and WebhookClient usage
- **Multiple JSDoc templates** available
- **Professional API reference** generation
- **GitHub-friendly** markdown documentation

---

**Navigation:**

- [← Back to Documentation](README.md)
- [Getting Started](getting-started.md)
- [API Reference](api/README.md)
