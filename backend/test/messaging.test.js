const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { Server } = require('socket.io');
const { io: client } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Message = require('../src/models/Message');
const { initSockets } = require('../src/sockets');

const A = '507f1f77bcf86cd799439011';
const B = '507f1f77bcf86cd799439012';
const C = '507f1f77bcf86cd799439013';
function event(socket, name, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(name, handler); reject(new Error(`Timeout: ${name}`)); }, 4000);
    const handler = value => {
      if (!predicate(value)) return;
      clearTimeout(timer); socket.off(name, handler); resolve(value);
    };
    socket.on(name, handler);
  });
}

test('JWT, live messaging, offline replay, receipts and multiple tabs', async t => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'isolated-test-secret';
  const originals = { findById: User.findById, create: Message.create, findPending: Message.findPending,
    markDelivered: Message.markDelivered, markAsRead: Message.markAsRead };
  const users = new Map([A, B, C].map(id => [id, { id, email: `${id}@alumnos.udg.mx`, isActive: id !== C }]));
  const stored = [];
  let sequence = 100;
  User.findById = async id => users.get(id);
  Message.create = async data => {
    const message = { ...data, id: (++sequence).toString(16).padStart(24, '0'), read: false,
      deliveredAt: null, createdAt: new Date().toISOString() };
    stored.push(message); return { ...message };
  };
  Message.findPending = async (receiverId, afterId) => stored.filter(m =>
    m.receiverId === receiverId && !m.deliveredAt && (!afterId || m.id > afterId)).slice(0, 100).map(m => ({ ...m }));
  Message.markDelivered = async (id, receiverId) => {
    const message = stored.find(m => m.id === id && m.receiverId === receiverId && !m.deliveredAt);
    if (!message) return null;
    message.deliveredAt = new Date().toISOString(); return { ...message };
  };
  Message.markAsRead = async (senderId, receiverId) => {
    stored.filter(m => m.senderId === senderId && m.receiverId === receiverId).forEach(m => m.read = true);
  };
  const server = http.createServer();
  const io = new Server(server);
  initSockets(io);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const sockets = [];
  function make(token) {
    const socket = client(url, { auth: { token }, autoConnect: false, reconnection: false, transports: ['websocket'] });
    sockets.push(socket); return socket;
  }
  const token = (id, extra = {}) => jwt.sign({ uid: id, email: users.get(id)?.email, ...extra }, process.env.JWT_SECRET, { expiresIn: '1h' });
  async function connect(id) {
    const socket = make(token(id)); const ready = event(socket, 'connect'); socket.connect(); await ready; return socket;
  }
  async function send(socket, data) { return socket.timeout(2000).emitWithAck('message:send', data); }
  t.after(async () => {
    sockets.forEach(s => s.disconnect());
    await new Promise(resolve => io.close(resolve));
    User.findById = originals.findById;
    for (const key of ['create', 'findPending', 'markDelivered', 'markAsRead']) Message[key] = originals[key];
    if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
  });

  for (const [value, expected] of [[null, 'AUTH_REQUIRED'], ['invalid', 'INVALID_TOKEN'],
    [token(A, { email: 'external@example.com' }), 'INVALID_DOMAIN'], [token(C), 'INVALID_USER'],
    [token(A, { uid: 'NaN' }), 'INVALID_TOKEN'],
    [jwt.sign({ uid: A, email: users.get(A).email }, process.env.JWT_SECRET, { expiresIn: -1 }), 'INVALID_TOKEN']]) {
    const socket = make(value); const rejected = event(socket, 'connect_error'); socket.connect();
    assert.equal((await rejected).message, expected);
  }
  const alice = await connect(A);
  const aliceTab = await connect(A);
  const bob = await connect(B);
  const aliceSent = event(aliceTab, 'message:sent');
  const bobReceived = event(bob, 'message:receive');
  const result = await send(alice, { receiverId: B, content: ' Hola ', senderId: B });
  assert.equal(result.ok, true);
  assert.equal(result.message.senderId, A, 'sender comes from JWT');
  assert.equal((await bobReceived).content, 'Hola');
  assert.equal((await aliceSent).id, result.message.id);
  assert.equal(stored.length, 1, 'stored before delivery');
  const delivered = event(alice, 'message:delivered');
  bob.emit('message:delivered', { id: result.message.id });
  assert.equal((await delivered).id, result.message.id);
  const read = event(alice, 'message:read'); bob.emit('message:read', { senderId: A });
  assert.equal((await read).readBy, B);
  assert.equal(stored[0].read, true);
  const typing = event(bob, 'message:typing');
  alice.emit('message:typing', { receiverId: B, isTyping: true });
  assert.deepEqual(await typing, { senderId: A, isTyping: true });
  const stopped = event(bob, 'message:typing', data => !data.isTyping);
  const stillOnline = event(bob, 'users:online', ids => ids.includes(A));
  alice.disconnect(); await stopped; await stillOnline;
  assert.equal((await send(aliceTab, { receiverId: B, content: '' })).ok, false);
  assert.equal((await send(aliceTab, null)).ok, false);
  assert.equal((await send(aliceTab, { receiverId: A, content: 'self' })).ok, false);
  assert.equal((await send(aliceTab, { receiverId: C, content: 'inactive' })).ok, false);
  assert.equal((await send(aliceTab, { receiverId: B, content: 'x'.repeat(2001) })).ok, false);

  const offline = event(aliceTab, 'users:online', ids => !ids.includes(B));
  bob.disconnect(); await offline;
  const queued = await send(aliceTab, { receiverId: B, content: 'Para cuando regreses' });
  assert.equal(queued.ok, true);
  assert.equal(stored[1].deliveredAt, null);
  const bobAgain = await connect(B);
  const replay = event(bobAgain, 'message:receive');
  bobAgain.emit('message:sync'); assert.equal((await replay).id, queued.message.id);
  const syncDone = event(bobAgain, 'message:synced'); bobAgain.emit('message:sync'); await syncDone;
  // A sender cannot acknowledge delivery on behalf of the recipient.
  aliceTab.emit('message:delivered', { id: queued.message.id });
  const receipt = event(aliceTab, 'message:delivered');
  bobAgain.emit('message:delivered', { id: queued.message.id }); await receipt;
  assert.ok(stored[1].deliveredAt);
  let replayCount = 0;
  bobAgain.on('message:receive', () => replayCount++);
  const complete = event(bobAgain, 'message:synced'); bobAgain.emit('message:sync'); await complete;
  assert.equal(replayCount, 0, 'acknowledged messages are not replayed');

  const expiring = make(jwt.sign({ uid: A, email: users.get(A).email,
    exp: Math.floor(Date.now() / 1000) + 1 }, process.env.JWT_SECRET));
  const expired = event(expiring, 'auth:expired');
  const disconnected = event(expiring, 'disconnect');
  expiring.connect(); await expired;
  assert.equal(await disconnected, 'io server disconnect');
});

test('history fetches latest page then returns chronological messages', async () => {
  const count = Message.countDocuments;
  const aggregate = Message.aggregate;
  let pipeline;
  Message.countDocuments = async () => 65;
  Message.aggregate = async stages => { pipeline = stages; return [{ id: 'newest' }, { id: 'older' }]; };
  try {
    const result = await Message.findConversation(A, B, 2, 30);
    assert.deepEqual(pipeline[1], { $sort: { createdAt: -1, _id: -1 } });
    assert.deepEqual(pipeline[2], { $skip: 30 });
    assert.deepEqual(result.messages.map(m => m.id), ['older', 'newest']);
    assert.equal(result.total, 65);
  } finally { Message.countDocuments = count; Message.aggregate = aggregate; }
});

test('delivery queries only update messages owned by the authenticated recipient', async () => {
  const update = Message.findOneAndUpdate;
  const find = Message.find;
  let updateFilter;
  let pendingFilter;
  Message.findOneAndUpdate = (filter, changes) => {
    updateFilter = filter;
    assert.ok(changes.$set.deliveredAt instanceof Date);
    return { lean: async () => null };
  };
  Message.find = filter => {
    pendingFilter = filter;
    return { sort: () => ({ limit: limit => {
      assert.equal(limit, 100);
      return { lean: async () => [] };
    } }) };
  };
  try {
    await Message.markDelivered(A, B);
    assert.deepEqual(updateFilter, { _id: A, receiverId: B, deliveredAt: null });
    await Message.findPending(B, A);
    assert.equal(pendingFilter.receiverId, B);
    assert.equal(pendingFilter.deliveredAt, null);
    assert.equal(String(pendingFilter._id.$gt), A);
  } finally { Message.findOneAndUpdate = update; Message.find = find; }
});
