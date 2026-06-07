const Message     = require('../models/Message');
const User        = require('../models/User');
const { socketAuth } = require('../middleware/socketAuth');

const MAX_MSG_LEN = 2000;

/**
 * Inicializa los eventos de Socket.io para mensajería en tiempo real.
 * Initialize Socket.io events for real-time messaging.
 *
 * Todos los sockets son autenticados con JWT antes de conectarse.
 * All sockets are JWT-authenticated before the connection completes.
 *
 * @param {import('socket.io').Server} io
 */
const initSockets = (io) => {
  // Mapa de usuarios online: userId (number) → socketId (string)
  // Online users map: userId (number) → socketId (string)
  const onlineUsers = new Map();

  // ── Middleware de autenticación aplicado a CADA conexión ──────────────────
  // Auth middleware applied to EVERY socket connection
  io.use(socketAuth);

  // ── Manejo de errores de autenticación en el cliente ─────────────────────
  // Auth errors are caught by the client's connect_error event
  io.on('connect_error', (err) => {
    console.warn(`⚠️  Socket auth error: ${err.message}`);
  });

  io.on('connection', (socket) => {
    const userId = socket.userId; // set by socketAuth middleware

    // Registrar usuario como online
    onlineUsers.set(userId, socket.id);

    socket.emit('connection:success', { userId, online: true });
    io.emit('users:online', Array.from(onlineUsers.keys()));

    console.log(`🔌 Socket conectado: ${socket.id} (userId=${userId})`);

    // ─────────────────────────────────────────────────────────────────────
    // message:send  { receiverId: number, content: string }
    // Envía un mensaje privado, lo persiste en SQLite y lo entrega en tiempo real.
    // Send a private message, persist to SQLite, deliver in real-time.
    // ─────────────────────────────────────────────────────────────────────
    socket.on('message:send', async (data, ack) => {
      try {
        const receiverId = parseInt(data?.receiverId, 10);
        const content    = typeof data?.content === 'string' ? data.content.trim() : '';

        // Validaciones básicas / Basic validations
        if (!Number.isFinite(receiverId) || receiverId <= 0) {
          return socket.emit('message:error', { code: 'INVALID_RECEIVER', message: 'receiverId inválido' });
        }
        if (!content) {
          return socket.emit('message:error', { code: 'EMPTY_CONTENT', message: 'El mensaje no puede estar vacío' });
        }
        if (content.length > MAX_MSG_LEN) {
          return socket.emit('message:error', { code: 'TOO_LONG', message: `Máximo ${MAX_MSG_LEN} caracteres` });
        }
        if (receiverId === userId) {
          return socket.emit('message:error', { code: 'SELF_MESSAGE', message: 'No puedes enviarte mensajes a ti mismo' });
        }

        // Verificar que el receptor exista y sea @alumnos.udg.mx
        // Verify receiver exists and is an institutional user
        const receiver = await User.findById(receiverId);
        if (!receiver || !receiver.email.endsWith('@alumnos.udg.mx') || !receiver.isActive) {
          return socket.emit('message:error', { code: 'INVALID_RECEIVER', message: 'Destinatario no encontrado' });
        }

        // Persistir mensaje en SQLite
        // Persist message to SQLite
        const message = await Message.create({ senderId: userId, receiverId, content });

        // Entregar al receptor si está online
        // Deliver to receiver if online
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message:receive', message);
        }

        // Confirmar envío al emisor
        // Confirm delivery to sender
        socket.emit('message:sent', message);

        // Callback de acknowledgement opcional (Socket.io ack)
        if (typeof ack === 'function') ack({ ok: true, message });

      } catch (err) {
        console.error('Error en message:send:', err);
        socket.emit('message:error', { code: 'SERVER_ERROR', message: 'Error al enviar el mensaje' });
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // message:typing  { receiverId: number, isTyping: boolean }
    // Retransmite el indicador "escribiendo..." al receptor si está online.
    // Relay the typing indicator to the receiver if online.
    // ─────────────────────────────────────────────────────────────────────
    socket.on('message:typing', ({ receiverId, isTyping }) => {
      try {
        const rid = parseInt(receiverId, 10);
        if (!Number.isFinite(rid)) return;

        const receiverSocketId = onlineUsers.get(rid);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message:typing', {
            senderId: userId,
            isTyping: !!isTyping,
          });
        }
      } catch (err) {
        console.error('Error en message:typing:', err);
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // message:read  { senderId: number }
    // El usuario actual marcó como leídos los mensajes de senderId.
    // Current user marks messages from senderId as read.
    // ─────────────────────────────────────────────────────────────────────
    socket.on('message:read', async ({ senderId: msgSenderId }) => {
      try {
        const sid = parseInt(msgSenderId, 10);
        if (!Number.isFinite(sid)) return;

        // Actualizar en BD / Update in DB
        await Message.markAsRead(sid, userId);

        // Notificar al emisor original que sus mensajes fueron leídos
        // Notify the original sender that their messages were read
        const senderSocketId = onlineUsers.get(sid);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:read', {
            readBy: userId,
            readAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Error en message:read:', err);
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // disconnect — limpiar del mapa de online
    // disconnect — remove from online map
    // ─────────────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('users:online', Array.from(onlineUsers.keys()));
      console.log(`🔌 Socket desconectado: ${socket.id} (userId=${userId})`);
    });
  });
};

module.exports = { initSockets };
