const { Types } = require('mongoose');
const Message = require('../models/Message');
const User    = require('../models/User');

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

const getHistory = async (req, res) => {
  const currentUserId = req.user.uid;
  const targetUserId  = req.params.userId;

  if (!Types.ObjectId.isValid(targetUserId))
    return res.status(400).json({ message: 'ID de usuario inválido' });
  if (currentUserId === targetUserId)
    return res.status(400).json({ message: 'No puedes ver una conversación contigo mismo' });

  try {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: 'Usuario no encontrado' });

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const { messages, total } = await Message.findConversation(currentUserId, targetUserId, page, limit);
    await Message.markAsRead(targetUserId, currentUserId);

    return res.status(200).json({
      messages, total, page,
      totalPages: Math.ceil(total / limit),
      with: User.toPublic(targetUser),
    });
  } catch (error) {
    console.error('Error en getHistory:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { getConversations, getHistory };
