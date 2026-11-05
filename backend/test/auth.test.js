const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const { CARRERAS } = require('../src/utils/validators');

test('registration options, signup, login and protected profile use the same API contract', async t => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'isolated-auth-test-secret';
  const find = User.findByEmail;
  const create = User.create;
  const users = new Map();
  User.findByEmail = async email => users.get(email.toLowerCase()) || null;
  User.create = async data => {
    const user = { ...data, id: '507f1f77bcf86cd799439011', isActive: true, rol: 'student' };
    users.set(data.email, user);
    return user;
  };
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../src/routes/auth.routes'));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    User.findByEmail = find; User.create = create;
    if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret;
    await new Promise(resolve => server.close(resolve));
  });
  const request = (method, route, body, token) => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: '/api/auth' + route,
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }, res => {
      let text = ''; res.on('data', chunk => text += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
    });
    req.on('error', reject); req.end(body ? JSON.stringify(body) : undefined);
  });
  const options = await request('GET', '/options');
  assert.equal(options.status, 200);
  assert.deepEqual(options.body.carreras, CARRERAS);
  const data = { email: ' PRUEBA@ALUMNOS.UDG.MX ', password: 'password-test-123', nombre: 'Alumno Prueba',
    carrera: options.body.carreras[2], semestre: options.body.maxSemestre };
  const registered = await request('POST', '/register', data);
  assert.equal(registered.status, 201);
  assert.equal(registered.body.user.email, 'prueba@alumnos.udg.mx');
  assert.equal(registered.body.user.semestre, 12);
  assert.equal(registered.body.user.password, undefined);
  assert.notEqual(users.get('prueba@alumnos.udg.mx').password, data.password);
  assert.equal(jwt.verify(registered.body.token, process.env.JWT_SECRET).uid, registered.body.user.id);
  const profile = await request('GET', '/me', undefined, registered.body.token);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.id, registered.body.user.id);
  assert.equal((await request('POST', '/register', data)).status, 409);
  assert.equal((await request('POST', '/register', { ...data, email: 'otro@example.com' })).status, 400);
  assert.equal((await request('POST', '/register', { ...data, carrera: 'Carrera inexistente' })).status, 400);
  const login = await request('POST', '/login', { email: data.email, password: data.password });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.id, registered.body.user.id);
});
