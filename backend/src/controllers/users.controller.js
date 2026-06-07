const User = require('../models/User');
const Post = require('../models/Post');

/**
 * GET /api/users?search=<query>
 * Busca usuarios por nombre o email. Excluye al usuario autenticado.
 * Search users by name or email, excluding the requesting user.
 *
 * Query: ?search=nombre
 * Response 200: { users: [{ id, nombre, carrera, email }] }
 *
 * @type {import('express').RequestHandler}
 */
const searchUsers = async (req, res) => {
  const { search = '' } = req.query;
  const currentUserId = req.user.uid;

  if (!search.trim()) {
    return res.status(200).json({ users: [] });
  }

  try {
    const users = await User.search(search.trim(), currentUserId);
    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error en searchUsers:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/users/:id
 * Retorna el perfil público de un usuario por ID.
 * Return a user's public profile by ID.
 *
 * Response 200: { user }
 *
 * @type {import('express').RequestHandler}
 */
const getPublicProfile = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    return res.status(400).json({ message: 'ID de usuario inválido' });
  }

  try {
    const user = await User.findPublicById(id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.status(200).json({ user });
  } catch (error) {
    console.error('Error en getPublicProfile:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/users/:id/posts
 * Retorna las publicaciones de un usuario, respetando la visibilidad por carrera.
 * Return a user's posts, respecting carrera visibility rules.
 *
 * Query: ?page=1 &limit=20
 * Response 200: { posts, total, page, totalPages }
 *
 * @type {import('express').RequestHandler}
 */
const getUserPosts = async (req, res) => {
  const authorId = parseInt(req.params.id, 10);
  if (!Number.isFinite(authorId) || authorId < 1) {
    return res.status(400).json({ message: 'ID de usuario inválido' });
  }

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
