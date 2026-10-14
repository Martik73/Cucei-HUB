const { Types } = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');

const searchUsers = async (req, res) => {
  const { search = '' } = req.query;
  const currentUserId = req.user.uid;
  if (!search.trim()) return res.status(200).json({ users: [] });
  try {
    const users = await User.search(search.trim(), currentUserId);
    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error en searchUsers:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const getPublicProfile = async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id))
    return res.status(400).json({ message: 'ID de usuario inválido' });
  try {
    const user = await User.findPublicById(id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.status(200).json({ user });
  } catch (error) {
    console.error('Error en getPublicProfile:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const getUserPosts = async (req, res) => {
  const { id: authorId } = req.params;
  if (!Types.ObjectId.isValid(authorId))
    return res.status(400).json({ message: 'ID de usuario inválido' });

  const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

  try {
    const currentUser = await User.findById(req.user.uid);
    if (!currentUser) return res.status(404).json({ message: 'Usuario no encontrado' });

    const data = await Post.findByUser({
      authorId,
      currentUserId:      currentUser.id,
      currentUserCarrera: currentUser.carrera,
      page,
      limit,
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error en getUserPosts:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { searchUsers, getPublicProfile, getUserPosts };
