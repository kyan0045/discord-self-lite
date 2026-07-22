const WebSocket = require("ws");
const { EventEmitter } = require("events");
const Message = require("../../classes/Message");
const Guild = require("../../classes/Guild");
const Channel = require("../../classes/Channel");
const ClientUser = require("../../classes/ClientUser");
class DiscordWebSocket extends EventEmitter {
  constructor(client, token, options = {}) {
    super();
    this.client = client;
    this.token = token;
    this.options = options;
    this.ws = null;
    this.heartbeatInterval = null;
    this.sequence = null;
    this.closeSequence = null;
    this.sessionId = null;
    this.resumeGatewayUrl = null;
    this.ready = false;
    this.hasEmittedReady = false;
    this.lastHeartbeatAcknowledged = true;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimer = null;
    this.identifyTimer = null;
    this.shouldReconnect = true;
    this.gatewayVersion = this.options.apiVersion || 9;
    this.gatewayUrl = `wss://gateway.discord.gg/?v=${this.gatewayVersion}&encoding=json`;
  }

  connect() {
    this.shouldReconnect = true;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const gatewayUrl = this.resumeGatewayUrl
      ? `${this.resumeGatewayUrl.replace(/\/$/, "")}/?v=${this.gatewayVersion}&encoding=json`
      : this.gatewayUrl;
    const ws = new WebSocket(gatewayUrl);
    this.ws = ws;

    ws.on("open", () => {
      this.client.emit("debug", "WebSocket connected");
      this.client.emit("connected");
    });

    ws.on("message", (data) => {
      this.handleMessage(data);
    });

    ws.on("close", (code, reason) => {
      if (this.ws !== ws) return;

      this.client.emit("debug", `WebSocket closed: ${code} - ${reason}`);
      this.ws = null;
      this.ready = false;
      if (this.sequence !== null) this.closeSequence = this.sequence;
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      if (this.identifyTimer) {
        clearTimeout(this.identifyTimer);
        this.identifyTimer = null;
      }
      this.client.emit("disconnected", code, reason);
      const terminalCodes = [4004, 4010, 4011, 4012, 4013, 4014];

      if (terminalCodes.includes(code)) {
        if (code === 4004) {
          try {
            ws.terminate();
          } catch {
            /* ignore */
          }
          this.client.emit(
            "error",
            `Authentication failed (close code ${code}). Please check your token and try again.`,
          );
          return;
        }

        this.client.emit(
          "debug",
          `Terminal error received (${code}). Connection will not be restarted. (Reason: ${reason})`,
        );
        return;
      }

      if ([4003, 4005, 4007, 4009].includes(code)) {
        this.resetSession();
      }

      if (code !== 1000 && this.shouldReconnect) {
        this.reconnect(code === 4000 ? 0 : undefined);
      }
    });

    ws.on("error", (error) => {
      this.client.emit(
        "error",
        `WebSocket error: ${error && error.message ? error.message : String(error)}`,
      );
    });
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.identifyTimer) {
      clearTimeout(this.identifyTimer);
      this.identifyTimer = null;
    }
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
    if (message.s !== null && message.s !== undefined) {
      this.sequence = message.s;
    }

    switch (message.op) {
      case 10: // Hello
        this.startHeartbeat(message.d.heartbeat_interval);
        if (this.sessionId && this.sequence !== null) {
          this.sendResume();
        } else {
          this.sendIdentify();
        }
        break;
      case 1: // Heartbeat requested
        this.sendHeartbeat();
        break;
      case 11: // Heartbeat acknowledged
        this.lastHeartbeatAcknowledged = true;
        break;
      case 7: // Reconnect requested
        this.client.emit("debug", "Discord requested a WebSocket reconnect");
        if (this.ws) this.ws.close(4000, "Gateway requested reconnect");
        break;
      case 9: // Invalid session
        this.handleInvalidSession(message.d);
        break;
      case 0: // Dispatch
        this.handleDispatch(message);
        break;
      default:
        this.client.emit("debug", `Unhandled op: ${message.op}`);
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

  sendResume() {
    this.send({
      op: 6,
      d: {
        token: this.token,
        session_id: this.sessionId,
        seq: this.sequence,
      },
    });
  }

  sendHeartbeat() {
    this.lastHeartbeatAcknowledged = false;
    this.send({
      op: 1,
      d: this.sequence,
    });
  }

  startHeartbeat(interval) {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.lastHeartbeatAcknowledged = true;
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        if (!this.lastHeartbeatAcknowledged) {
          this.client.emit(
            "debug",
            "Heartbeat was not acknowledged; reconnecting WebSocket",
          );
          this.ws.close(4009, "Heartbeat acknowledgement timeout");
          return;
        }
        this.sendHeartbeat();
      }
    }, interval);
  }

  handleInvalidSession(resumable) {
    this.client.emit("debug", `Invalid session (resumable: ${resumable})`);
    if (resumable && this.sessionId && this.sequence !== null) {
      this.sendResume();
      return;
    }

    this.resetSession();
    this.ready = false;
    const delay = 1000 + Math.floor(Math.random() * 4000);
    this.client.emit("reconnecting", this.reconnectAttempts, delay);
    this.identifyTimer = setTimeout(() => {
      this.identifyTimer = null;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendIdentify();
      }
    }, delay);
  }

  resetSession() {
    this.sessionId = null;
    this.client.sessionId = null;
    this.sequence = null;
    this.closeSequence = null;
    this.resumeGatewayUrl = null;
  }

  handleDispatch(message) {
    switch (message.t) {
      case "READY":
        this.sessionId = message.d.session_id;
        this.client.sessionId = message.d.session_id;
        this.resumeGatewayUrl = message.d.resume_gateway_url || null;
        this.client.user = new ClientUser(this.client, message.d.user);

        // Process guilds from READY payload
        if (message.d.guilds) {
          for (const guildData of message.d.guilds) {
            this.handleGuildCreate(guildData);
          }
        }

        this.ready = true;
        this.reconnectAttempts = 0;
        if (this.hasEmittedReady) {
          this.client.emit("reidentified", message.d);
        } else {
          this.hasEmittedReady = true;
          this.client.emit("ready", message.d);
        }
        break;
      case "RESUMED": {
        const replayedEvents =
          this.closeSequence === null ? 0 : this.sequence - this.closeSequence;
        this.ready = true;
        this.reconnectAttempts = 0;
        this.client.emit("resumed", replayedEvents, message.d);
        break;
      }
      case "MESSAGE_CREATE": {
        const msg = new Message(this.client, message.d);
        this.client.emit("messageCreate", msg);
        break;
      }
      case "GUILD_CREATE": {
        this.handleGuildCreate(message.d);
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

  async handleGuildCreate(data) {
    const guild = new Guild(this.client, this.client.rest, data);
    this.client.guilds.set(guild.id, guild);

    // Populate the client's member information for this guild
    if (data.members) {
      const clientMember = data.members.find(
        (member) => member.user.id === this.client.user.id,
      );
      if (clientMember) {
        const GuildMember = require("../../classes/GuildMember");
        const member = new GuildMember(this.client, clientMember, guild);
        guild._members.set(this.client.user.id, member);
      }
    }

    // If no member data in GUILD_CREATE, fetch it from API
    if (!guild._members.has(this.client.user.id)) {
      try {
        const memberData = await this.client.rest.fetchGuildMember(guild.id);
        const GuildMember = require("../../classes/GuildMember");
        const member = new GuildMember(this.client, memberData, guild);
        guild._members.set(this.client.user.id, member);
      } catch (err) {
        this.client.emit(
          "debug",
          `Failed to fetch member for guild ${guild.id}: ${err && err.message ? err.message : String(err)}`,
        );
      }
    }

    this.client.emit("guildCreate", guild);
  }

  reconnect(delay) {
    if (this.reconnectTimer || !this.shouldReconnect) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.client.emit("error", "Max reconnect attempts reached");
      this.client.emit("maxReconnects");
      return;
    }

    this.reconnectAttempts++;
    if (delay === undefined) {
      delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    }
    this.client.emit("debug", `Reconnecting in ${delay}ms...`);
    this.client.emit("reconnecting", this.reconnectAttempts, delay);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

module.exports = DiscordWebSocket;
