const { Types } = require('mongoose');
const Message   = require('../models/Message');
const User      = require('../models/User');
const { socketAuth } = require('../middleware/socketAuth');

const MAX_MSG_LEN = 2000;

const initSockets = (io) => {
  // userId (ObjectId string) → socketId
  const onlineUsers = new Map();

  io.use(socketAuth);

  io.on('connect_error', (err) => {
    console.warn(`⚠️  Socket auth error: ${err.message}`);
  });

  io.on('connection', (socket) => {
    const userId = socket.userId; // ObjectId string set by socketAuth

    onlineUsers.set(userId, socket.id);
    socket.emit('connection:success', { userId, online: true });
    io.emit('users:online', Array.from(onlineUsers.keys()));
    console.log(`🔌 Socket conectado: ${socket.id} (userId=${userId})`);

    socket.on('message:send', async (data, ack) => {
      try {
        const receiverId = typeof data?.receiverId === 'string' ? data.receiverId.trim() : '';
        const content    = typeof data?.content    === 'string' ? data.content.trim()    : '';

        if (!Types.ObjectId.isValid(receiverId)) {
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

        const receiver = await User.findById(receiverId);
        if (!receiver || !receiver.email.endsWith('@alumnos.udg.mx') || !receiver.isActive) {
          return socket.emit('message:error', { code: 'INVALID_RECEIVER', message: 'Destinatario no encontrado' });
        }

        const message = await Message.create({ senderId: userId, receiverId, content });

        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) io.to(receiverSocketId).emit('message:receive', message);

        socket.emit('message:sent', message);
        if (typeof ack === 'function') ack({ ok: true, message });
      } catch (err) {
        console.error('Error en message:send:', err);
        socket.emit('message:error', { code: 'SERVER_ERROR', message: 'Error al enviar el mensaje' });
      }
    });

    socket.on('message:typing', ({ receiverId, isTyping }) => {
      try {
        if (!Types.ObjectId.isValid(receiverId)) return;
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message:typing', { senderId: userId, isTyping: !!isTyping });
        }
      } catch (err) {
        console.error('Error en message:typing:', err);
      }
    });

    socket.on('message:read', async ({ senderId: msgSenderId }) => {
      try {
        if (!Types.ObjectId.isValid(msgSenderId)) return;
        await Message.markAsRead(msgSenderId, userId);
        const senderSocketId = onlineUsers.get(msgSenderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:read', { readBy: userId, readAt: new Date().toISOString() });
        }
      } catch (err) {
        console.error('Error en message:read:', err);
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('users:online', Array.from(onlineUsers.keys()));
      console.log(`🔌 Socket desconectado: ${socket.id} (userId=${userId})`);
    });
  });
};

module.exports = { initSockets };
