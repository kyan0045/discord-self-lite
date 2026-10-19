const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");

const DiscordWebSocket = require("../src/connection/ws/WebSocket");
const RestManager = require("../src/connection/rest/RestManager");
const Message = require("../src/classes/Message");
const DiscordAPIError = require("../src/classes/DiscordAPIError");
const RouteQueueFullError = require("../src/classes/RouteQueueFullError");

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
