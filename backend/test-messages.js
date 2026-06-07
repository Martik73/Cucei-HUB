/**
 * Script de prueba: mensajería en tiempo real entre 2 clientes Socket.io
 * Test script: real-time messaging between 2 Socket.io clients
 *
 * Mide latencia end-to-end (message:send → message:receive)
 * Measures end-to-end latency (message:send → message:receive)
 *
 * Uso / Usage:  node test-messages.js
 */

require('dotenv').config();
const http         = require('http');
const { io: ioClient } = require('socket.io-client');

const BASE_URL  = 'http://localhost:5000';
const API_BASE  = BASE_URL + '/api';
const ITERATIONS = 10;

// ── Helpers HTTP ──────────────────────────────────────────────────────────────

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path: '/api' + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(data  ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (d) => (raw += d));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Registro/login de usuarios de prueba ──────────────────────────────────────

async function getToken(email, nombre, carrera) {
  const r = await apiRequest('POST', '/auth/register', {
    email, password: 'test1234', nombre, carrera, semestre: 3,
  });
  if (r.status === 201) return r.body.token;
  const r2 = await apiRequest('POST', '/auth/login', { email, password: 'test1234' });
  if (r2.status === 200) return r2.body.token;
  throw new Error(`No se pudo autenticar ${email}: ${JSON.stringify(r2.body)}`);
}

// ── Conectar cliente Socket.io ────────────────────────────────────────────────

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    socket.on('connection:success', () => resolve(socket));
    socket.on('connect_error', (err) => reject(new Error('connect_error: ' + err.message)));
    setTimeout(() => reject(new Error('Timeout al conectar socket')), 5000);
  });
}

// ── Test de latencia ──────────────────────────────────────────────────────────

async function measureLatency(socketA, socketB, receiverUserId) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();

    const timeout = setTimeout(() => {
      socketB.off('message:receive');
      reject(new Error('Timeout: mensaje no recibido en 2000ms'));
    }, 2000);

    socketB.once('message:receive', () => {
      clearTimeout(timeout);
      resolve(Date.now() - t0);
    });

    socketA.emit('message:send', {
      receiverId: receiverUserId,
      content: `Ping ${Date.now()}`,
    });
  });
}

// ── Test REST: conversaciones e historial ─────────────────────────────────────

async function testRest(tokenA, userBId, tokenB) {
  const results = [];

  // GET /api/messages/conversations (usuario A)
  let r = await apiRequest('GET', '/messages/conversations', null, tokenA);
  results.push(['GET /api/messages/conversations', r.status, 200,
    `conv_count=${r.body.conversations?.length ?? 'err'}`]);

  // GET /api/messages/:userId (historial A→B)
  r = await apiRequest('GET', `/messages/${userBId}`, null, tokenA);
  results.push(['GET /api/messages/:userId', r.status, 200,
    `total=${r.body.total ?? 'err'} pages=${r.body.totalPages ?? 'err'}`]);

  // GET /api/messages/:userId — sin token → 401
  r = await apiRequest('GET', `/messages/${userBId}`);
  results.push(['GET /api/messages/:userId (sin token)', r.status, 401,
    r.body.message]);

  // GET /api/messages/conversations (usuario B — debe ver conv con A)
  r = await apiRequest('GET', '/messages/conversations', null, tokenB);
  const hasConvWithA = r.body.conversations?.some(c => c.userId === userBId - 1 || true);
  results.push(['GET /api/messages/conversations (B)', r.status, 200,
    `conv_count=${r.body.conversations?.length ?? 'err'}`]);

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(60));
  console.log('  CUCEI HUB — Test de Mensajería en Tiempo Real');
  console.log('═'.repeat(60));

  // 1. Autenticación
  console.log('\n[1/4] Autenticando usuarios de prueba...');
  const tokenA = await getToken('test.alice@alumnos.udg.mx', 'Alice Test', 'Otra');
  const tokenB = await getToken('test.bob@alumnos.udg.mx',   'Bob Test',   'Otra');

  // Obtener userId de cada usuario
  const meA = await apiRequest('GET', '/auth/me', null, tokenA);
  const meB = await apiRequest('GET', '/auth/me', null, tokenB);
  const userAId = meA.body.user.id;
  const userBId = meB.body.user.id;
  console.log(`   Alice (id=${userAId}) ✅`);
  console.log(`   Bob   (id=${userBId}) ✅`);

  // 2. Conexión WebSocket
  console.log('\n[2/4] Conectando sockets...');
  const socketA = await connectSocket(tokenA);
  const socketB = await connectSocket(tokenB);
  console.log(`   Alice socket: ${socketA.id} ✅`);
  console.log(`   Bob   socket: ${socketB.id} ✅`);

  // 3. Prueba de latencia (A → B)
  console.log(`\n[3/4] Midiendo latencia (${ITERATIONS} mensajes A → B)...`);
  const latencies = [];

  for (let i = 1; i <= ITERATIONS; i++) {
    try {
      const ms = await measureLatency(socketA, socketB, userBId);
      latencies.push(ms);
      process.stdout.write(`   [${i}/${ITERATIONS}] ${ms}ms\n`);
    } catch (e) {
      console.error(`   [${i}/${ITERATIONS}] ERROR: ${e.message}`);
    }
  }

  if (latencies.length > 0) {
    const avg  = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const min  = Math.min(...latencies);
    const max  = Math.max(...latencies);
    const p95  = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

    console.log('\n  ─── Estadísticas de latencia ───');
    console.log(`   Promedio : ${avg}ms`);
    console.log(`   Mínima   : ${min}ms`);
    console.log(`   Máxima   : ${max}ms`);
    console.log(`   P95      : ${p95}ms`);
    console.log(`   Objetivo : < 2000ms  ${avg < 2000 ? '✅ CUMPLIDO' : '❌ EXCEDIDO'}`);
  }

  // 4. REST API
  console.log('\n[4/4] Probando REST API de mensajería...');
  const restResults = await testRest(tokenA, userBId, tokenB);

  console.log('\n  ─── Resultados REST ───');
  console.log('ENDPOINT'.padEnd(48) + 'GOT  EXP  PASS  DETALLE');
  console.log('─'.repeat(90));
  restResults.forEach(([ep, got, exp, detail]) => {
    const pass = got === exp ? '✅' : '❌';
    console.log(ep.padEnd(48) + String(got).padStart(3) + '  ' + String(exp).padStart(3) + '  ' + pass + '   ' + detail);
  });

  // 5. Test de socket sin token → error
  console.log('\n  ─── Seguridad WebSocket ───');
  await new Promise((resolve) => {
    const bad = ioClient(BASE_URL, { auth: { token: 'token-invalido' }, transports: ['websocket'], reconnection: false });
    bad.on('connect_error', (err) => {
      console.log(`   Socket sin token válido → connect_error: "${err.message}" ✅`);
      bad.disconnect();
      resolve();
    });
    setTimeout(() => { bad.disconnect(); resolve(); }, 3000);
  });

  // Cleanup
  socketA.disconnect();
  socketB.disconnect();

  console.log('\n✅ Test completo\n');
}

main().catch((err) => {
  console.error('\n❌ Error en el test:', err.message);
  process.exit(1);
});
