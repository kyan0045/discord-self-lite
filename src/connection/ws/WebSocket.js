const WebSocket = require("ws");
const { EventEmitter } = require("events");
const Message = require("../../classes/Message");
const Guild = require("../../classes/Guild");
const Channel = require("../../classes/Channel");
const WebSocketError = require("../../classes/WebSocketError");

class DiscordWebSocket extends EventEmitter {
  constructor(client, token, options = {}) {
    super();
    this.client = client;
    this.token = token;
    this.options = options;
    this.ws = null;
    this.heartbeatInterval = null;
    this.sequence = null;
    this.sessionId = null;
    this.ready = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.gatewayVersion = this.options.apiVersion || 9;
    this.gatewayUrl = `wss://gateway.discord.gg/?v=${this.gatewayVersion}&encoding=json`;
  }

  connect() {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(this.gatewayUrl);

    this.ws.on("open", () => {
      console.log("WebSocket connected");
      this.client.emit("connected");
    });

    this.ws.on("message", (data) => {
      this.handleMessage(data);
    });

    this.ws.on("close", (code, reason) => {
      console.log(`WebSocket closed: ${code} - ${reason}`);
      this.ready = false;
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      this.client.emit("disconnected", code, reason);
      if (code !== 1000) {
        // Not a clean close
        this.reconnect();
      }
    });

    this.ws.on("error", (error) => {
      const wsError = new WebSocketError(`WebSocket error: ${error.message}`);
      console.error(wsError);
      this.client.emit("error", wsError);
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
    }
  }

  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  handleMessage(data) {
    const message = JSON.parse(data.toString());
    this.sequence = message.s;

    switch (message.op) {
      case 10: // Hello
        this.startHeartbeat(message.d.heartbeat_interval);
        this.sendIdentify();
        break;
      case 11: // Heartbeat ACK
        // Heartbeat acknowledged
        break;
      case 0: // Dispatch
        this.handleDispatch(message);
        break;
      default:
        console.log("Unhandled op:", message.op);
    }
  }

  sendIdentify() {
    const payload = {
      op: 2,
      d: {
        token: this.token,
        properties: {
          $os: process.platform,
          $browser: "Discord Client",
          $device: "Discord Client",
          system_locale: "en-US",
        },
        compress: false,
        presence: this.client.options.presence,
        capabilities: 0,
        client_state: {
          guild_versions: {},
        },
      },
    };
    this.send(payload);
  }

  startHeartbeat(interval) {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          op: 1,
          d: this.sequence,
        });
      }
    }, interval);
  }

  handleDispatch(message) {
    switch (message.t) {
      case "READY":
        this.sessionId = message.d.session_id;
        this.client.sessionId = message.d.session_id;
        this.ready = true;
        this.client.emit("ready", message.d);
        break;
      case "MESSAGE_CREATE": {
        const msg = new Message(this.client, message.d);
        this.client.emit("messageCreate", msg);
        break;
      }
      case "GUILD_CREATE": {
        const guild = new Guild(this.client, this.client.rest, message.d);
        this.client.guilds.set(guild.id, guild);
        this.client.emit("guildCreate", guild);
        break;
      }
      case "CHANNEL_CREATE": {
        const channel = new Channel(this.client, this.client.rest, message.d);
        this.client.channels.set(channel.id, channel);
        this.client.emit("channelCreate", channel);
        break;
      }
      default:
        this.client.emit("dispatch", message);
    }
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      const err = new WebSocketError("Max reconnect attempts reached");
      console.error(err);
      this.client.emit("error", err);
      this.client.emit("maxReconnects");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff
    console.log(`Reconnecting in ${delay}ms...`);
    setTimeout(() => {
      this.connect();
    }, delay);
  }
}

module.exports = DiscordWebSocket;
