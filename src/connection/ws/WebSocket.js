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
      this.client.emit("debug", "WebSocket connected");
      this.client.emit("connected");
    });

    this.ws.on("message", (data) => {
      this.handleMessage(data);
    });

    this.ws.on("close", (code, reason) => {
      this.client.emit("debug", `WebSocket closed: ${code} - ${reason}`);
      this.ready = false;
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      this.client.emit("disconnected", code, reason);
      const terminalCodes = [4004, 4010, 4011, 4012, 4013, 4014];

      if (terminalCodes.includes(code)) {
        if (code === 4004) {
          try {
            if (this.ws) this.ws.terminate();
          } catch {
            /* ignore */
          }
          this.ws = null;
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

      if (code !== 1000) {
        this.reconnect();
      }
    });

    this.ws.on("error", (error) => {
      this.client.emit(
        "error",
        `WebSocket error: ${error && error.message ? error.message : String(error)}`,
      );
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
      case 11: // Heartbeat acknowledged
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
        this.client.user = new ClientUser(this.client, message.d.user);

        // Process guilds from READY payload
        if (message.d.guilds) {
          for (const guildData of message.d.guilds) {
            this.handleGuildCreate(guildData);
          }
        }

        this.ready = true;
        this.client.emit("ready", message.d);
        break;
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

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.client.emit("error", "Max reconnect attempts reached");
      this.client.emit("maxReconnects");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff
    this.client.emit("debug", `Reconnecting in ${delay}ms...`);
    setTimeout(() => {
      this.connect();
    }, delay);
  }
}

module.exports = DiscordWebSocket;
