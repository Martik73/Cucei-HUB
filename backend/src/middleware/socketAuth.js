const jwt = require('jsonwebtoken');
const { Types } = require('mongoose');
const User = require('../models/User');

/**
 * Middleware de autenticación para Socket.io.
 * Se aplica ANTES de cada conexión con io.use().
 * Authentication middleware for Socket.io — applied before every connection.
 *
 * El cliente debe enviar el JWT en: socket.handshake.auth.token
 * Client must send JWT in: socket.handshake.auth.token
 *
 * - Si el token falta o es inválido → next(Error) desconecta al socket
 * - Si es válido → adjunta userId y email al socket para uso posterior
 *
 * @param {import('socket.io').Socket} socket
 * @param {Function} next
 */
const socketAuth = async (socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('AUTH_REQUIRED'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.email?.endsWith('@alumnos.udg.mx')) {
      return next(new Error('INVALID_DOMAIN'));
    }
    if (!Types.ObjectId.isValid(decoded.uid)) return next(new Error('INVALID_TOKEN'));
    const user = await User.findById(decoded.uid);
    if (!user?.isActive || user.email !== decoded.email) return next(new Error('INVALID_USER'));

    // Adjuntar datos del usuario al socket para todos los eventos
    // Attach user data to socket for use in all event handlers
    socket.userId    = decoded.uid;   // MongoDB ObjectId string
    socket.userEmail = decoded.email;
    socket.tokenExpiresAt = decoded.exp * 1000;
    next();
  } catch {
    next(new Error('INVALID_TOKEN'));
  }
};

module.exports = { socketAuth };
