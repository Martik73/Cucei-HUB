const { Types } = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const { socketAuth } = require('../middleware/socketAuth');

const room = (id) => `user:${id}`;

const initSockets = (io) => {
  const onlineUsers = new Map();
  io.use(socketAuth);

  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(room(userId));
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    io.emit('users:online', [...onlineUsers.keys()]);

    // JWTs must remain valid for the entire connection, not just the handshake.
    const expiry = setTimeout(() => {
      socket.emit('auth:expired');
      socket.disconnect(true);
    }, Math.max(0, socket.tokenExpiresAt - Date.now()));
    expiry.unref?.();

    socket.on('message:send', async (data, ack) => {
      const fail = (message) => {
        if (typeof ack === 'function') ack({ ok: false, error: message });
        else socket.emit('message:error', { message });
      };
      try {
        const receiverId = typeof data?.receiverId === 'string' ? data.receiverId.trim() : '';
        const content = typeof data?.content === 'string' ? data.content.trim() : '';
        if (!Types.ObjectId.isValid(receiverId)) return fail('Destinatario inválido');
        if (receiverId === userId) return fail('No puedes enviarte mensajes a ti mismo');
        if (!content || content.length > 2000) return fail('El mensaje debe tener entre 1 y 2000 caracteres');
        const receiver = await User.findById(receiverId);
        if (!receiver?.isActive || !receiver.email.endsWith('@alumnos.udg.mx')) return fail('Destinatario no encontrado');

        // Persist before emitting: offline recipients recover this record on reconnect.
        const message = await Message.create({ senderId: userId, receiverId, content });
        io.to(room(userId)).emit('message:sent', message);
        io.to(room(receiverId)).emit('message:receive', message);
        if (typeof ack === 'function') ack({ ok: true, message });
      } catch (error) {
        console.error('Error en message:send:', error);
        fail('Error al guardar el mensaje');
      }
    });

    let syncing = false;
    socket.on('message:sync', async () => {
      if (syncing) return;
      syncing = true;
      try {
        let afterId;
        while (socket.connected) {
          const messages = await Message.findPending(userId, afterId);
          for (const message of messages) socket.emit('message:receive', message);
          if (messages.length < 100) break;
          afterId = messages[messages.length - 1].id;
        }
        socket.emit('message:synced');
      } catch (error) {
        console.error('Error en message:sync:', error);
        socket.emit('message:error', { message: 'No se pudieron recuperar los mensajes pendientes' });
      } finally { syncing = false; }
    });

    socket.on('message:delivered', async (data) => {
      if (!Types.ObjectId.isValid(data?.id)) return;
      try {
        // The recipient identity always comes from the verified JWT.
        const receipt = await Message.markDelivered(data.id, userId);
        if (receipt) io.to(room(receipt.senderId)).emit('message:delivered', receipt);
      } catch (error) { console.error('Error en message:delivered:', error); }
    });

    const typingTargets = new Set();
    socket.on('message:typing', (data) => {
      if (!Types.ObjectId.isValid(data?.receiverId) || typeof data.isTyping !== 'boolean') return;
      if (data.isTyping) {
        if (typingTargets.size >= 20 && !typingTargets.has(data.receiverId)) return;
        typingTargets.add(data.receiverId);
      } else typingTargets.delete(data.receiverId);
      // Volatile events must never replay a stale typing indicator after reconnect.
      io.to(room(data.receiverId)).volatile.emit('message:typing', { senderId: userId, isTyping: data.isTyping });
    });

    socket.on('message:read', async (data) => {
      if (!Types.ObjectId.isValid(data?.senderId)) return;
      try {
        await Message.markAsRead(data.senderId, userId);
        io.to(room(data.senderId)).emit('message:read', { readBy: userId });
        io.to(room(userId)).emit('conversations:changed');
      } catch (error) { console.error('Error en message:read:', error); }
    });

    socket.on('disconnect', () => {
      clearTimeout(expiry);
      for (const target of typingTargets) {
        io.to(room(target)).emit('message:typing', { senderId: userId, isTyping: false });
      }
      const sockets = onlineUsers.get(userId);
      sockets?.delete(socket.id);
      if (!sockets?.size) onlineUsers.delete(userId);
      io.emit('users:online', [...onlineUsers.keys()]);
    });
  });
};

module.exports = { initSockets };
