const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const { once } = require('node:events');
const express = require('express');
const jwt = require('jsonwebtoken');
const Material = require('../src/models/Material');
const CommunityMessage = require('../src/models/CommunityMessage');
const { getMessages } = require('../src/controllers/community.controller');
const materialRoutes = require('../src/routes/material.routes');

const id = '507f1f77bcf86cd799439011';

test('PDF preview and download require a JWT and cannot read arbitrary stored paths', async t => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'isolated-material-test-secret';
  const original = Material.findById;
  const filename = `test-${crypto.randomUUID()}.pdf`;
  const directory = path.join(__dirname, '../uploads/materials');
  const file = path.join(directory, filename);
  await fs.mkdir(directory, { recursive: true });
  const contents = Buffer.from('%PDF-1.4\nTest material\n%%EOF');
  await fs.writeFile(file, contents, { flag: 'wx' });
  let record = { id, tipo: 'pdf', titulo: 'Material de prueba', fileUrl: `/uploads/materials/${filename}` };
  Material.findById = async () => record;
  const app = express();
  app.use('/api/materials', materialRoutes);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    Material.findById = original;
    if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
    await new Promise(resolve => server.close(resolve));
    await fs.unlink(file);
  });
  const request = (route, token) => new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port: server.address().port, path: route,
      headers: token ? { Authorization: `Bearer ${token}` } : {} }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
  });
  const url = `/api/materials/${id}/file`;
  const token = jwt.sign({ uid: id, email: 'prueba@alumnos.udg.mx' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  assert.equal((await request(url)).status, 401);
  assert.equal((await request(url, 'invalid')).status, 401);
  const expired = jwt.sign({ uid: id, email: 'prueba@alumnos.udg.mx' }, process.env.JWT_SECRET, { expiresIn: -1 });
  assert.equal((await request(url, expired)).status, 401);
  assert.equal((await request(url + '?token=' + token)).status, 401, 'query tokens are not accepted');
  const preview = await request(url, token);
  assert.equal(preview.status, 200);
  assert.deepEqual(preview.body, contents);
  assert.match(preview.headers['content-type'], /application\/pdf/);
  assert.equal(preview.headers['cache-control'], 'private, no-store');
  const download = await request(url + '?download=1', token);
  assert.equal(download.status, 200);
  assert.match(download.headers['content-disposition'], /^attachment/);
  assert.equal((await request('/api/materials/invalid/file', token)).status, 400);
  record = { ...record, fileUrl: '/uploads/materials/../../.env' };
  assert.equal((await request(url, token)).status, 404);
  record = { ...record, fileUrl: '/uploads/materials/not-found.pdf' };
  assert.equal((await request(url, token)).status, 404);
  record = { ...record, tipo: 'youtube' };
  assert.equal((await request(url, token)).status, 404);
  record = null;
  assert.equal((await request(url, token)).status, 404);
});

test('community history starts with the latest 50 and paginates older messages without omissions', async () => {
  const originalCount = CommunityMessage.countDocuments;
  const originalAggregate = CommunityMessage.aggregate;
  // Simulate the sort and paging stages with more than two pages and tied dates.
  const rows = Array.from({ length: 123 }, (_, i) => ({ id: String(i + 1).padStart(24, '0'),
    createdAt: new Date(2026, 0, 1, 0, Math.floor(i / 2)).toISOString() }));
  CommunityMessage.countDocuments = async () => rows.length;
  CommunityMessage.aggregate = async pipeline => {
    const order = pipeline.find(stage => stage.$sort).$sort;
    const skip = pipeline.find(stage => stage.$skip !== undefined).$skip;
    const limit = pipeline.find(stage => stage.$limit).$limit;
    return [...rows].sort((a, b) => order.createdAt * a.createdAt.localeCompare(b.createdAt)
      || (order._id || 0) * a.id.localeCompare(b.id)).slice(skip, skip + limit);
  };
  try {
    const first = await CommunityMessage.findByCommunity(id);
    assert.equal(first.messages[0].id, rows[73].id);
    assert.equal(first.messages.at(-1).id, rows[122].id);
    assert.equal(first.totalPages, 3);
    const second = await CommunityMessage.findByCommunity(id, { page: 2, limit: 50 });
    const third = await CommunityMessage.findByCommunity(id, { page: 3, limit: 50 });
    assert.deepEqual([...third.messages, ...second.messages, ...first.messages], rows);
  } finally {
    CommunityMessage.countDocuments = originalCount;
    CommunityMessage.aggregate = originalAggregate;
  }
});

test('community history clamps invalid page and limit values', async () => {
  const original = CommunityMessage.findByCommunity;
  let received;
  CommunityMessage.findByCommunity = async (_id, options) => { received = options; return { messages: [] }; };
  try {
    await getMessages({ params: { id }, query: { page: '-2', limit: '99999' } }, { json() {} });
    assert.deepEqual(received, { page: 1, limit: 50 });
  } finally { CommunityMessage.findByCommunity = original; }
});
