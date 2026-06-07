const User = require('../models/User');

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

module.exports = { searchUsers };
