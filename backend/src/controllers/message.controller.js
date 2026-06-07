const Message = require('../models/Message');
const User    = require('../models/User');

/**
 * GET /api/messages/conversations
 * Lista todas las conversaciones del usuario autenticado.
 * List all conversations for the authenticated user, ordered by most recent.
 *
 * Cada entrada incluye: info del otro usuario, último mensaje, conteo de no leídos.
 *
 * Response 200: { conversations: [...] }
 *
 * @type {import('express').RequestHandler}
 */
const getConversations = async (req, res) => {
  const userId = req.user.uid;

  try {
    const conversations = await Message.getConversations(userId);
    return res.status(200).json({ conversations });
  } catch (error) {
    console.error('Error en getConversations:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/messages/:userId
 * Historial paginado de mensajes entre el usuario autenticado y :userId.
 * Paginated message history between the authenticated user and :userId.
 * Marca automáticamente como leídos los mensajes del otro usuario.
 *
 * Query: ?page=1 &limit=20
 * Response 200: { messages, total, page, totalPages, with: { ...userData } }
 *
 * @type {import('express').RequestHandler}
 */
const getHistory = async (req, res) => {
  const currentUserId = req.user.uid;
  const targetUserId  = parseInt(req.params.userId, 10);

  if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ message: 'ID de usuario inválido' });
  }

  if (currentUserId === targetUserId) {
    return res.status(400).json({ message: 'No puedes ver una conversación contigo mismo' });
  }

  try {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: 'Usuario no encontrado' });

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const { messages, total } = await Message.findConversation(currentUserId, targetUserId, page, limit);

    // Marcar mensajes del otro usuario como leídos
    // Mark messages from the other user to the current user as read
    await Message.markAsRead(targetUserId, currentUserId);

    return res.status(200).json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      with: User.toPublic(targetUser),
    });
  } catch (error) {
    console.error('Error en getHistory:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { getConversations, getHistory };
