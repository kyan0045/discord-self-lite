const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");

const DiscordWebSocket = require("../src/connection/ws/WebSocket");
const RestManager = require("../src/connection/rest/RestManager");
const Client = require("../src/classes/Client");
const Message = require("../src/classes/Message");
const Channel = require("../src/classes/Channel");
const Guild = require("../src/classes/Guild");
const GuildMember = require("../src/classes/GuildMember");
const BitField = require("../src/classes/BitField");
const Permissions = require("../src/classes/Permissions");
const DiscordAPIError = require("../src/classes/DiscordAPIError");
const RouteQueueFullError = require("../src/classes/RouteQueueFullError");
const RestManagerDestroyedError = require("../src/classes/RestManagerDestroyedError");

function createClient() {
  const client = new EventEmitter();
  client.channels = new Map();
  client.guilds = new Map();
  client.users = new Map();
  client.user = { id: "self" };
  client.sessionId = null;
  client.getChannel = (id) => client.channels.get(id) || null;
  client.rest = {
    fetchGuildMember: async () => ({ user: { id: "self" } }),
  };
  return client;
}

function createGateway() {
  const client = createClient();
  const ws = new DiscordWebSocket(client, "token");
  return { client, ws };
}

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  const values = new Map(
    Object.entries(headers).map(([key, value]) => [
      key.toLowerCase(),
      String(value),
    ]),
  );

  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => values.get(name.toLowerCase()) ?? null },
    json: async () => body,
  };
}

function mockFetch(t, handler) {
  const original = global.fetch;
  global.fetch = handler;
  t.after(() => {
    global.fetch = original;
  });
}

test("GUILD_CREATE caches channels and active threads", async () => {
  const { client, ws } = createGateway();

  await ws.handleGuildCreate({
    id: "g1",
    name: "Guild",
    channels: [
      { id: "c1", guild_id: "g1", name: "general", type: 0 },
      { id: "c2", guild_id: "g1", name: "voice", type: 2 },
    ],
    threads: [{ id: "t1", guild_id: "g1", name: "thread", type: 11 }],
    members: [{ user: { id: "self" } }],
  });

  assert.equal(client.channels.get("c1").name, "general");
  assert.equal(client.channels.get("c2").type, 2);
  assert.equal(client.channels.get("t1").isThread(), true);

  const message = new Message(client, {
    id: "m1",
    channel_id: "c1",
    guild_id: "g1",
    author: { id: "u1", username: "user" },
  });
  assert.equal(message.channel.name, "general");
});

test("channel and thread events keep the cache coherent", () => {
  const { client, ws } = createGateway();

  const updates = [];
  const deletes = [];
  client.on("channelUpdate", (channel, previous) =>
    updates.push([channel, previous]),
  );
  client.on("channelDelete", (channel) => deletes.push(channel));

  ws.handleDispatch({
    t: "CHANNEL_CREATE",
    d: { id: "c1", guild_id: "g1", name: "general", type: 0 },
  });
  ws.handleDispatch({
    t: "CHANNEL_UPDATE",
    d: { id: "c1", guild_id: "g1", name: "renamed", type: 0 },
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0][0].name, "renamed");
  assert.equal(updates[0][1].name, "general");
  assert.equal(client.channels.get("c1").name, "renamed");

  ws.handleDispatch({ t: "CHANNEL_DELETE", d: { id: "c1" } });
  assert.equal(deletes.length, 1);
  assert.equal(client.channels.has("c1"), false);

  ws.handleDispatch({
    t: "THREAD_CREATE",
    d: { id: "t1", guild_id: "g1", name: "thread", type: 11 },
  });
  assert.equal(client.channels.get("t1").isThread(), true);

  ws.handleDispatch({
    t: "THREAD_UPDATE",
    d: { id: "t1", guild_id: "g1", name: "renamed thread", type: 11 },
  });
  assert.equal(client.channels.get("t1").name, "renamed thread");

  ws.handleDispatch({ t: "THREAD_DELETE", d: { id: "t1" } });
  assert.equal(client.channels.has("t1"), false);
});

test("READY caches private channels", () => {
  const { client, ws } = createGateway();

  ws.handleDispatch({
    t: "READY",
    d: {
      session_id: "s1",
      user: { id: "self", username: "self" },
      guilds: [],
      private_channels: [{ id: "dm1", type: 1 }],
    },
  });

  assert.equal(client.channels.get("dm1").isDM(), true);
});

test("guild updates keep members and deletes drop the guild's channels", () => {
  const { client, ws } = createGateway();
  const members = new Map([["self", { id: "self" }]]);
  client.guilds.set("g1", { id: "g1", name: "Old", _members: members });
  client.channels.set("c1", { id: "c1", guildId: "g1" });

  ws.handleDispatch({ t: "GUILD_UPDATE", d: { id: "g1", name: "New" } });
  assert.equal(client.guilds.get("g1").name, "New");
  assert.equal(client.guilds.get("g1")._members, members);

  ws.handleDispatch({ t: "GUILD_DELETE", d: { id: "g1", unavailable: true } });
  assert.ok(client.guilds.get("g1"));

  ws.handleDispatch({ t: "GUILD_DELETE", d: { id: "g1" } });
  assert.equal(client.guilds.has("g1"), false);
  assert.equal(client.channels.has("c1"), false);
});

test("DiscordAPIError exposes the Discord error code", () => {
  const error = new DiscordAPIError("Missing Permissions", 403, "/x", {
    code: 50013,
  });

  assert.equal(error.code, 50013);
  assert.equal(new DiscordAPIError("Oops", 500, "/y").code, null);
});

test("a full route queue rejects with RouteQueueFullError", async () => {
  const rest = new RestManager("token");
  rest.processQueue = () => {};

  const pending = [];
  for (let i = 0; i < 50; i++) {
    pending.push(rest.request("/channels/1/messages", { method: "POST" }));
  }

  await assert.rejects(
    rest.request("/channels/1/messages", { method: "POST" }),
    (error) => {
      assert.ok(error instanceof RouteQueueFullError);
      assert.equal(error.code, "ROUTE_QUEUE_FULL");
      assert.equal(error.limit, 50);
      return true;
    },
  );

  assert.equal(pending.length, 50);
});

test("destroy aborts in-flight requests and rejects queued work", async (t) => {
  const rest = new RestManager("token");
  let startedResolve;
  let requestSignal;
  const started = new Promise((resolve) => {
    startedResolve = resolve;
  });

  t.mock.method(global, "fetch", (_url, options) => {
    requestSignal = options.signal;
    startedResolve();
    return new Promise((_resolve, reject) => {
      if (options.signal.aborted) {
        reject(options.signal.reason);
        return;
      }
      options.signal.addEventListener(
        "abort",
        () => reject(options.signal.reason),
        { once: true },
      );
    });
  });

  const inFlight = rest.request("/channels/1/messages", { method: "POST" });
  const inFlightRejected = assert.rejects(inFlight, {
    code: "REST_MANAGER_DESTROYED",
  });
  await started;

  const queued = rest.request("/channels/1/messages", { method: "POST" });
  const queuedRejected = assert.rejects(queued, {
    code: "REST_MANAGER_DESTROYED",
  });

  const sleeping = rest.sleep(60_000);
  const sleepingRejected = assert.rejects(sleeping, {
    code: "REST_MANAGER_DESTROYED",
  });

  rest.destroy();

  assert.equal(rest.destroyed, true);
  assert.equal(requestSignal.aborted, true);
  assert.ok(rest.destroyReason instanceof RestManagerDestroyedError);
  await Promise.all([inFlightRejected, queuedRejected, sleepingRejected]);
  await assert.rejects(rest.request("/channels/1/messages"), {
    code: "REST_MANAGER_DESTROYED",
  });

  // A second destroy is a no-op
  rest.destroy();
});

test("destroy can use a caller-provided error", async () => {
  const rest = new RestManager("token");
  rest.processQueue = () => {};

  const pending = rest.request("/channels/1/messages", { method: "POST" });
  const rejected = assert.rejects(pending, { code: "CLIENT_STOPPED" });

  rest.destroy(
    Object.assign(new Error("Client has been stopped."), {
      code: "CLIENT_STOPPED",
    }),
  );

  await rejected;
});

test("Client uses the configured REST manager class", async () => {
  class CustomRestManager extends RestManager {}

  const client = new Client({ restClass: CustomRestManager });
  client.connect = async () => {
    client.emit("ready", {});
  };

  await client.login("token");

  assert.ok(client.rest instanceof CustomRestManager);
  assert.equal(client.rest.token, "token");

  client.destroy();
  assert.equal(client.rest.destroyed, true);
});

test("a persistent 429 stops after the retry budget", async (t) => {
  const rest = new RestManager("token");
  let calls = 0;
  const log = console.log;
  console.log = () => {};
  t.after(() => {
    console.log = log;
  });

  mockFetch(t, async () => {
    calls++;
    return jsonResponse(
      {
        message: "You are being rate limited.",
        retry_after: 0,
        global: false,
      },
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "x-ratelimit-bucket": "bucket-a",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset-after": "0",
        },
      },
    );
  });

  await assert.rejects(
    rest.request("/channels/1/messages", { method: "POST" }),
    (error) => {
      assert.ok(error instanceof DiscordAPIError);
      assert.equal(error.status, 429);
      return true;
    },
  );

  assert.equal(calls, 3);
});

test("client errors are not retried", async (t) => {
  const rest = new RestManager("token");
  let calls = 0;

  mockFetch(t, async () => {
    calls++;
    return jsonResponse(
      { message: "401: Unauthorized" },
      {
        status: 401,
        headers: { "content-type": "application/json" },
      },
    );
  });

  await assert.rejects(rest.request("/users/@me"), (error) => {
    assert.ok(error instanceof DiscordAPIError);
    assert.equal(error.status, 401);
    return true;
  });

  assert.equal(calls, 1);
});

test("rate limits follow the x-ratelimit-bucket header", () => {
  const rest = new RestManager("token");
  const headers = new Headers({
    "x-ratelimit-bucket": "bucket-a",
    "x-ratelimit-remaining": "0",
    "x-ratelimit-reset-after": "10",
    "x-ratelimit-limit": "5",
  });

  rest.updateRateLimits("/channels/1/messages", "POST", headers);
  rest.updateRateLimits("/channels/1/messages", "PATCH", headers);

  // Different routes within the same bucket and major parameter share state.
  assert.equal(rest.rateLimits.size, 1);
  assert.equal(rest.isRateLimited("/channels/1/messages", "POST"), true);
  assert.equal(rest.isRateLimited("/channels/1/messages", "PATCH"), true);

  // The same bucket hash with another channel is a separate bucket.
  rest.updateRateLimits("/channels/2/messages", "POST", headers);
  assert.equal(rest.rateLimits.size, 2);
});

test("expired rate limits keep learned bucket mappings", () => {
  const rest = new RestManager("token");
  const headers = new Headers({
    "x-ratelimit-bucket": "bucket-a",
    "x-ratelimit-remaining": "1",
    "x-ratelimit-reset-after": "-1",
    "x-ratelimit-limit": "5",
  });

  rest.updateRateLimits("/channels/1/messages", "POST", headers);

  assert.equal(rest.rateLimits.size, 0);
  assert.equal(rest.routeBuckets.size, 1);
});

test("requests in the same bucket are serialized", async (t) => {
  const rest = new RestManager("token");
  const headers = new Headers({
    "x-ratelimit-bucket": "bucket-a",
    "x-ratelimit-remaining": "5",
    "x-ratelimit-reset-after": "60",
    "x-ratelimit-limit": "5",
  });

  rest.updateRateLimits("/channels/1/messages", "POST", headers);
  rest.updateRateLimits("/channels/1/messages", "PATCH", headers);

  const calls = [];
  let releaseFirst;
  let firstStartedResolve;
  const firstStarted = new Promise((resolve) => {
    firstStartedResolve = resolve;
  });
  const gate = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  mockFetch(t, async (_url, options) => {
    calls.push(options.method);
    if (options.method === "POST") {
      firstStartedResolve();
      await gate;
    }
    return jsonResponse(
      {},
      {
        status: 200,
        headers: {
          "x-ratelimit-bucket": "bucket-a",
          "x-ratelimit-remaining": "4",
          "x-ratelimit-reset-after": "60",
        },
      },
    );
  });

  const first = rest.request("/channels/1/messages", { method: "POST" });
  await firstStarted;
  const second = rest.request("/channels/1/messages", { method: "PATCH" });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(calls, ["POST"]);

  releaseFirst();
  await Promise.all([first, second]);

  assert.deepEqual(calls, ["POST", "PATCH"]);
  assert.equal(rest.bucketLocks.size, 0);
});

test("malformed gateway frames are ignored", () => {
  const { client, ws } = createGateway();
  const debug = [];
  client.on("debug", (message) => debug.push(message));

  assert.doesNotThrow(() => ws.handleMessage(Buffer.from("{not json")));
  assert.match(debug[0], /Failed to parse gateway message/);

  assert.doesNotThrow(() => ws.handleMessage(Buffer.from("null")));
  assert.match(debug[1], /not an object/);

  assert.doesNotThrow(() => ws.handleMessage(Buffer.from("[]")));
  assert.match(debug[2], /not an object/);
});

test("login rejects and stops the socket when the gateway errors", async () => {
  const client = new Client();
  let disconnected = 0;

  client.ws = {
    disconnect: () => {
      disconnected++;
    },
  };
  client.connect = async () => {
    client.emit("error", "boom");
  };

  await assert.rejects(client.login("token"), /boom/);
  assert.equal(disconnected, 1);
});

test("login ignores recoverable gateway errors", async () => {
  const client = new Client();
  let disconnected = 0;

  client.ws = {
    disconnect: () => {
      disconnected++;
    },
  };
  client.connect = async () => {
    const error = Object.assign(new Error("temporary socket failure"), {
      fatal: false,
    });
    client.emit("error", error);
    client.emit("ready", {});
  };

  await client.login("token");
  assert.equal(disconnected, 0);
});

test("terminal close codes stop reconnecting and emit a fatal error", () => {
  const { client, ws } = createGateway();
  const errors = [];
  const socket = { terminate() {} };

  client.on("error", (error) => errors.push(error));
  ws.ws = socket;
  ws.sessionId = "session";
  ws.sequence = 1;

  ws.handleClose(socket, 4014, "Disallowed intent");

  assert.equal(ws.shouldReconnect, false);
  assert.equal(ws.reconnectTimer, null);
  assert.equal(ws.sessionId, null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, 4014);
  assert.equal(errors[0].fatal, true);
});

test("a close before ready emits a fatal error", () => {
  const { client, ws } = createGateway();
  const errors = [];
  const socket = {};

  client.on("error", (error) => errors.push(error));
  ws.ws = socket;

  ws.handleClose(socket, 1000, "Normal closure");

  assert.equal(ws.shouldReconnect, false);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, 1000);
  assert.equal(errors[0].fatal, true);
});

test("a normal close after ready reconnects", () => {
  const { client, ws } = createGateway();
  const socket = {};
  const reconnects = [];

  ws.ws = socket;
  ws.hasEmittedReady = true;
  ws.reconnect = (delay) => reconnects.push(delay);

  ws.handleClose(socket, 1000, "Normal closure");

  assert.deepEqual(reconnects, [undefined]);
  assert.equal(ws.shouldReconnect, true);
  assert.equal(client.listenerCount("error"), 0);
});

test("a normal close after ready does not reconnect after disconnect", () => {
  const { client, ws } = createGateway();
  const socket = {};
  const reconnects = [];

  ws.ws = socket;
  ws.hasEmittedReady = true;
  ws.shouldReconnect = false;
  ws.reconnect = (delay) => reconnects.push(delay);

  ws.handleClose(socket, 1000, "Client disconnect");

  assert.deepEqual(reconnects, []);
  assert.equal(ws.shouldReconnect, false);
  assert.equal(client.listenerCount("error"), 0);
});

test("the reconnect limit is configurable and stops when exhausted", () => {
  const { client, ws } = createGateway();
  const errors = [];
  let maxReconnects = 0;

  client.on("error", (error) => errors.push(error));
  client.on("maxReconnects", () => maxReconnects++);

  ws.maxReconnectAttempts = 2;
  ws.reconnectAttempts = 2;
  ws.reconnect(0);

  assert.equal(ws.shouldReconnect, false);
  assert.equal(ws.reconnectTimer, null);
  assert.equal(maxReconnects, 1);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, "MAX_RECONNECTS");
  assert.equal(errors[0].fatal, true);
});

test("invalid non-resumable sessions count against the reconnect limit", () => {
  const { client, ws } = createGateway();
  const errors = [];
  let maxReconnects = 0;
  let closedWith = null;

  client.on("error", (error) => errors.push(error));
  client.on("maxReconnects", () => maxReconnects++);

  ws.ws = {
    close: (code) => {
      closedWith = code;
    },
  };
  ws.heartbeatInterval = setInterval(() => {}, 60_000);
  ws.maxReconnectAttempts = 1;
  ws.reconnectAttempts = 1;
  ws.handleInvalidSession(false);

  assert.equal(ws.shouldReconnect, false);
  assert.equal(ws.identifyTimer, null);
  assert.equal(ws.heartbeatInterval, null);
  assert.equal(ws.ws, null);
  assert.equal(closedWith, 1000);
  assert.equal(maxReconnects, 1);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, "MAX_RECONNECTS");
  assert.equal(errors[0].fatal, true);
});

test("disconnect clears timers and detaches the socket", () => {
  const { ws } = createGateway();
  let closedWith = null;

  ws.heartbeatInterval = setInterval(() => {}, 60_000);
  ws.ws = {
    close: (code) => {
      closedWith = code;
    },
  };

  ws.disconnect();

  assert.equal(ws.shouldReconnect, false);
  assert.equal(ws.ready, false);
  assert.equal(ws.heartbeatInterval, null);
  assert.equal(ws.ws, null);
  assert.equal(closedWith, 1000);
});

test("Client validates maxReconnectAttempts and passes it to the gateway", () => {
  assert.throws(
    () => new Client({ maxReconnectAttempts: -1 }),
    /maxReconnectAttempts/,
  );
  assert.throws(
    () => new Client({ maxReconnectAttempts: "5" }),
    /maxReconnectAttempts/,
  );
  assert.throws(
    () => new Client({ maxReconnectAttempts: 1.5 }),
    /maxReconnectAttempts/,
  );

  const client = new Client({ maxReconnectAttempts: Infinity });
  const { ws } = createGateway();
  const configured = new DiscordWebSocket(client, "token", client.options);

  assert.equal(configured.maxReconnectAttempts, Infinity);
  assert.equal(ws.maxReconnectAttempts, 5);
});

test("BitField and Permissions resolve string flags and return set flags in toArray", () => {
  const perms = new Permissions("SEND_MESSAGES");
  assert.equal(perms.bitfield, Permissions.FLAGS.SEND_MESSAGES);
  assert.equal(perms.has("SEND_MESSAGES"), true);
  assert.equal(perms.has("MANAGE_GUILD"), false);
  assert.equal(perms.any(["MANAGE_GUILD", "SEND_MESSAGES"]), true);
  assert.deepEqual(perms.missing(["SEND_MESSAGES", "MANAGE_GUILD"]), [
    "MANAGE_GUILD",
  ]);
  assert.deepEqual(perms.toArray(), ["SEND_MESSAGES"]);

  const multi = new Permissions(["SEND_MESSAGES", "ADD_REACTIONS"]);
  assert.deepEqual(multi.toArray(), ["ADD_REACTIONS", "SEND_MESSAGES"]);

  assert.throws(() => new Permissions("NOT_A_REAL_FLAG"), TypeError);
  assert.throws(() => BitField.resolve(-1), TypeError);
  assert.throws(() => BitField.resolve(1.5), TypeError);
});

test("Channel#permissionsFor applies overwrites in Discord order and GuildMember handles null permissions", () => {
  const client = createClient();
  const guild = new Guild(client, client.rest, {
    id: "g1",
    owner_id: "owner",
    roles: [
      { id: "g1", permissions: Permissions.FLAGS.SEND_MESSAGES.toString() },
      { id: "r1", permissions: "0" },
      { id: "r2", permissions: "0" },
    ],
  });

  const member = new GuildMember(
    client,
    {
      user: { id: "u1", username: "user" },
      roles: ["r1", "r2"],
      permissions: null,
    },
    guild,
  );
  assert.equal(member._permissions, null);
  assert.equal(member.hasPermission("SEND_MESSAGES"), true);
  assert.equal(member.hasPermission("MANAGE_MESSAGES"), false);

  const channel = new Channel(client, client.rest, {
    id: "c1",
    guild_id: "g1",
    type: 0,
    permission_overwrites: [
      // Role 2 allows SEND_MESSAGES, Role 1 denies SEND_MESSAGES (listed after r2)
      {
        id: "r2",
        type: 0,
        allow: Permissions.FLAGS.SEND_MESSAGES.toString(),
        deny: "0",
      },
      {
        id: "r1",
        type: 0,
        allow: "0",
        deny: Permissions.FLAGS.SEND_MESSAGES.toString(),
      },
      // @everyone denies SEND_MESSAGES and EMBED_LINKS
      {
        id: "g1",
        type: 0,
        allow: "0",
        deny: (
          Permissions.FLAGS.SEND_MESSAGES | Permissions.FLAGS.EMBED_LINKS
        ).toString(),
      },
    ],
  });

  // Role allow overrides role deny regardless of overwrite array order
  const perms = channel.permissionsFor(member);
  assert.equal(perms.has("SEND_MESSAGES"), true);
  assert.equal(perms.has("EMBED_LINKS"), false);

  // Member overwrite overrides role allow
  channel.permissionOverwrites.push({
    id: "u1",
    type: 1,
    allow: Permissions.FLAGS.EMBED_LINKS.toString(),
    deny: Permissions.FLAGS.SEND_MESSAGES.toString(),
  });
  const memberPerms = channel.permissionsFor(member);
  assert.equal(memberPerms.has("SEND_MESSAGES"), false);
  assert.equal(memberPerms.has("EMBED_LINKS"), true);
});

test("Client destroy and disconnect settle pending login and clean up re-logins", async (t) => {
  const client1 = new Client();
  client1.connect = async () => {};
  const login1 = client1.login("token-1");
  client1.destroy();
  await assert.rejects(login1, { code: "REST_MANAGER_DESTROYED" });

  const client2 = new Client();
  client2.connect = async () => {};
  const login2 = client2.login("token-2");
  client2.disconnect();
  await assert.rejects(login2, /Client disconnected before ready/);

  const client3 = new Client();
  client3.connect = async () => {};
  const firstLogin = client3.login("token-a");
  const firstRest = client3.rest;
  const secondLogin = client3.login("token-b");
  await assert.rejects(firstLogin, /superseded/);
  assert.equal(firstRest.destroyed, true);
  client3.emit("ready", {});
  await secondLogin;
  client3.destroy();

  // Verify options.ws forwarding and prior socket disconnect on connect()
  const wsPath = require.resolve("ws");
  const discordWsPath = require.resolve("../src/connection/ws/WebSocket");
  const clientPath = require.resolve("../src/classes/Client");
  const origWsModule = require.cache[wsPath].exports;
  const origDiscordWsCache = require.cache[discordWsPath];
  const origClientCache = require.cache[clientPath];

  const createdSockets = [];
  class MockWebSocket extends EventEmitter {
    constructor(url, options) {
      super();
      this.url = url;
      this.options = options;
      this.readyState = 1;
      this.closedWith = null;
      createdSockets.push(this);
    }
    close(code) {
      this.closedWith = code;
    }
  }
  MockWebSocket.OPEN = 1;
  MockWebSocket.CONNECTING = 0;

  t.after(() => {
    require.cache[wsPath].exports = origWsModule;
    require.cache[discordWsPath] = origDiscordWsCache;
    require.cache[clientPath] = origClientCache;
  });

  require.cache[wsPath].exports = MockWebSocket;
  delete require.cache[discordWsPath];
  delete require.cache[clientPath];
  const FreshClient = require("../src/classes/Client");

  const wsClient = new FreshClient({ ws: { headers: { "X-Test": "1" } } });
  wsClient.token = "token";
  await wsClient.connect();
  assert.equal(createdSockets.length, 1);
  assert.deepEqual(createdSockets[0].options, { headers: { "X-Test": "1" } });

  await wsClient.connect();
  assert.equal(createdSockets[0].closedWith, 1000);
  assert.equal(createdSockets.length, 2);
  wsClient.destroy();
});

test("Gateway handles heartbeat timeout, resume URL fallback, invalid sessions, guild updates, and malformed frames", async () => {
  const { client, ws } = createGateway();

  // Heartbeat timeout closes with 4000 so sessionId/sequence survive for resume
  let closedCode = null;
  ws.ws = {
    readyState: 1,
    close: (code) => {
      closedCode = code;
    },
  };
  ws.sessionId = "s1";
  ws.sequence = 12;
  ws.ready = true;
  ws.hasEmittedReady = true;
  ws.resumeGatewayUrl = "wss://resume.example.com";
  ws.startHeartbeat(60_000);
  ws.lastHeartbeatAcknowledged = false;
  // Simulate interval callback firing with unacknowledged heartbeat
  clearInterval(ws.heartbeatInterval);
  ws.heartbeatInterval = null;
  ws.startHeartbeat(10);
  ws.lastHeartbeatAcknowledged = false;
  await new Promise((resolve) => setTimeout(resolve, 25));
  clearInterval(ws.heartbeatInterval);
  ws.heartbeatInterval = null;
  assert.equal(closedCode, 4000);

  // When a post-ready socket closes while ready, resumeGatewayUrl is preserved
  ws.ws = { close: () => {} };
  ws.ready = true;
  ws.reconnect = () => {};
  ws.handleClose(ws.ws, 4000, "Heartbeat timeout");
  assert.equal(ws.sessionId, "s1");
  assert.equal(ws.resumeGatewayUrl, "wss://resume.example.com");

  // If the reconnect attempt fails before becoming ready, resumeGatewayUrl falls back to null
  ws.ws = { close: () => {} };
  ws.ready = false;
  ws.handleClose(ws.ws, 1006, "Connection failed");
  assert.equal(ws.resumeGatewayUrl, null);

  // handleInvalidSession clears prior identifyTimer and bounds resumable: true
  const existingTimer = setTimeout(() => {}, 60_000);
  ws.identifyTimer = existingTimer;
  ws.sessionId = "s1";
  ws.sequence = 12;
  ws.maxReconnectAttempts = 1;
  ws.reconnectAttempts = 0;
  let sentPayload = null;
  ws.send = (p) => {
    sentPayload = p;
  };
  ws.handleInvalidSession(true);
  assert.equal(ws.identifyTimer, null);
  assert.equal(sentPayload.op, 6);
  assert.equal(ws.reconnectAttempts, 1);

  const fatalErrors = [];
  client.on("error", (err) => fatalErrors.push(err));
  ws.ws = { close: () => {} };
  ws.handleInvalidSession(true);
  assert.equal(fatalErrors.length, 1);
  assert.equal(fatalErrors[0].code, "MAX_RECONNECTS");

  // Unavailable guilds and missing user fields in handleGuildCreate do not reject or cache broken guilds
  await ws.handleGuildCreate({ id: "g-unavail", unavailable: true });
  assert.equal(client.guilds.has("g-unavail"), false);

  client.user = null;
  await ws.handleGuildCreate({
    id: "g-nouser",
    name: "NoUser",
    members: [{ nick: "orphan" }],
  });
  assert.equal(client.guilds.get("g-nouser").name, "NoUser");

  // GUILD_UPDATE updates member.guild and invalidates cached member permissions
  client.user = { id: "self" };
  const oldGuild = new Guild(client, client.rest, {
    id: "g1",
    name: "Old",
    roles: [{ id: "g1", permissions: "0" }],
  });
  const cachedMember = new GuildMember(
    client,
    { user: { id: "self" }, roles: [] },
    oldGuild,
  );
  assert.equal(cachedMember.permissions.has("SEND_MESSAGES"), false);
  oldGuild._members.set("self", cachedMember);
  client.guilds.set("g1", oldGuild);

  ws.handleDispatch({
    t: "GUILD_UPDATE",
    d: {
      id: "g1",
      name: "New",
      roles: [
        { id: "g1", permissions: Permissions.FLAGS.SEND_MESSAGES.toString() },
      ],
    },
  });
  assert.equal(cachedMember.guild, client.guilds.get("g1"));
  assert.equal(cachedMember._permissions, null);
  assert.equal(cachedMember.permissions.has("SEND_MESSAGES"), true);

  // Malformed frames with missing d do not throw
  assert.doesNotThrow(() =>
    ws.handleMessage(Buffer.from(JSON.stringify({ op: 10, d: null }))),
  );
  assert.doesNotThrow(() =>
    ws.handleDispatch({ t: "CHANNEL_UPDATE", d: null }),
  );
  assert.doesNotThrow(() => ws.handleDispatch({ t: "GUILD_UPDATE", d: null }));
});
