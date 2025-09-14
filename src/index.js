/**
 * discord-self-lite - A lightweight Discord selfbot library
 * @module discord-self-lite
 * @version 0.1.0
 * @description A modern, lightweight Discord selfbot library with webhook support, built for Node.js 22+ with zero external dependencies (except ws for WebSocket connections).
 *
 * @example
 * // Import the library
 * const { Client, WebhookClient } = require('discord-self-lite');
 *
 * // Create a Discord client
 * const client = new Client();
 * client.login('your-token');
 *
 * // Create a webhook client
 * const webhook = new WebhookClient('webhook-url');
 * await webhook.send('Hello, world!');
 */

const Client = require("./classes/Client");
const WebhookClient = require("./connection/webhook/WebhookClient");

/**
 * Main package exports
 * @namespace discord-self-lite
 */
module.exports = {
  /**
   * The main Discord client class for connecting to Discord and handling events
   * @type {Client}
   * @see {@link Client}
   */
  Client,

  /**
   * Discord webhook client class for sending messages via webhooks
   * @type {WebhookClient}
   * @see {@link WebhookClient}
   */
  WebhookClient,
};
