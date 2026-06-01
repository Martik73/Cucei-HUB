/**
 * Configuración de Socket.io para mensajería en tiempo real.
 * Se inicializa con la instancia del servidor HTTP desde server.js.
 *
 * @param {import('socket.io').Server} io
 */
const initSockets = (io) => {
  // Mapa de usuarios conectados: userId -> socketId
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Socket conectado: ${socket.id}`);

    // El cliente debe enviar su userId al conectarse
    socket.on('user:online', (userId) => {
      onlineUsers.set(userId, socket.id);
      io.emit('users:online', Array.from(onlineUsers.keys()));
    });

    // TODO: Implementar evento de mensaje privado
    socket.on('message:send', (data) => {
      // data: { senderId, receiverId, content }
      // Guardar en MongoDB y emitir al receiver
    });

    socket.on('disconnect', () => {
      // Eliminar usuario del mapa de conectados
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      io.emit('users:online', Array.from(onlineUsers.keys()));
      console.log(`🔌 Socket desconectado: ${socket.id}`);
    });
  });
};

module.exports = { initSockets };
