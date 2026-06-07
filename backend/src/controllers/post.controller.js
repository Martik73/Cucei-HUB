const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Reaction = require('../models/Reaction');
const { validatePostType, validatePostCategory, validateReactionType } = require('../utils/postValidators');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parsea y valida un ID de ruta como entero positivo.
 * Parse and validate a route param ID as a positive integer.
 *
 * @param {string} raw
 * @returns {number|null}
 */
const parseId = (raw) => {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Verifica que el usuario pueda ver/interactuar con un post de tipo 'carrera'.
 * Check the user has access to a carrera post.
 *
 * @param {import('../models/Post').IPost} post
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
const hasCarreraAccess = async (post, userId) => {
  if (post.type !== 'carrera') return true;
  const user = await User.findById(userId);
  return user?.carrera === post.carrera;
};

// ─── Endpoints ────────────────────────────────────────────────────────────────

/**
 * POST /api/posts
 * Crea una nueva publicación. El autor se obtiene del token JWT.
 * Create a new post. Author is derived from the JWT payload.
 *
 * Body: { content, type, category }
 * Response 201: { message, post }
 *
 * @type {import('express').RequestHandler}
 */
const createPost = async (req, res) => {
  const { content, type, category } = req.body;
  const userId = req.user.uid;

  try {
    let carrera = null;

    if (type === 'carrera') {
      const author = await User.findById(userId);
      if (!author) return res.status(404).json({ message: 'Usuario no encontrado' });
      carrera = author.carrera;
    }

    const post = await Post.create({ authorId: userId, content, type, category, carrera });

    return res.status(201).json({
      message: 'Publicación creada exitosamente',
      post,
    });
  } catch (error) {
    console.error('Error en createPost:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/posts
 * Retorna el feed paginado del usuario autenticado con filtrado estricto por carrera.
 * Return the authenticated user's paginated feed with strict carrera filtering.
 *
 * Query: ?type=general|carrera &category=duda|evento|trabajo|general &page=1 &limit=20
 * Response 200: { posts, total, page, totalPages }
 *
 * REGLA CRÍTICA: posts de carrera SOLO son visibles para usuarios de esa misma carrera.
 *
 * @type {import('express').RequestHandler}
 */
const getFeed = async (req, res) => {
  const userId = req.user.uid;
  const { type, category, page = '1', limit = '20' } = req.query;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    const { posts, total } = await Post.findFeed({
      userId,
      userCarrera: user.carrera,
      type:     type     || null,
      category: category || null,
      page:     pageNum,
      limit:    limitNum,
    });

    return res.status(200).json({
      posts,
      total,
      page:       pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error en getFeed:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/posts/:id
 * Retorna una publicación con detalles completos.
 * Return a single post with full details (reactions, comments count, author).
 *
 * Response 200: { post }
 * Response 403: publicación de otra carrera
 * Response 404: no encontrada
 *
 * @type {import('express').RequestHandler}
 */
const getPost = async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(400).json({ message: 'ID de publicación inválido' });

  const userId = req.user.uid;

  try {
    const post = await Post.findWithDetails(postId, userId);
    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });

    if (!(await hasCarreraAccess(post, userId))) {
      return res.status(403).json({ message: 'No tienes acceso a esta publicación' });
    }

    const reactions = await Reaction.countsByPost(postId);

    return res.status(200).json({
      post: { ...post, reactions },
    });
  } catch (error) {
    console.error('Error en getPost:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * PUT /api/posts/:id
 * Edita una publicación. Solo el autor puede hacerlo.
 * Edit a post. Only the author is allowed.
 *
 * Body: { content?, category? }
 * Response 200: { message, post }
 *
 * @type {import('express').RequestHandler}
 */
const updatePost = async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(400).json({ message: 'ID de publicación inválido' });

  const { content, category } = req.body;
  const userId = req.user.uid;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });

    if (post.authorId !== userId) {
      return res.status(403).json({ message: 'Solo el autor puede editar esta publicación' });
    }

    const updated = await Post.update(postId, { content, category });

    return res.status(200).json({
      message: 'Publicación actualizada',
      post: updated,
    });
  } catch (error) {
    console.error('Error en updatePost:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * DELETE /api/posts/:id
 * Elimina una publicación. Solo el autor o un admin pueden hacerlo.
 * Delete a post. Only the author or an admin may do so.
 *
 * Response 200: { message }
 *
 * @type {import('express').RequestHandler}
 */
const deletePost = async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(400).json({ message: 'ID de publicación inválido' });

  const userId = req.user.uid;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });

    if (post.authorId !== userId && req.user.rol !== 'admin') {
      return res.status(403).json({ message: 'No tienes permiso para eliminar esta publicación' });
    }

    await Post.delete(postId);

    return res.status(200).json({ message: 'Publicación eliminada exitosamente' });
  } catch (error) {
    console.error('Error en deletePost:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * POST /api/posts/:id/react
 * Toggle de reacción en una publicación.
 * Toggle a reaction on a post (add, replace, or remove).
 *
 * Body: { reaction: 'like'|'love'|'celebrate' }
 * Response 200: { message, userReaction, reactions }
 *
 * @type {import('express').RequestHandler}
 */
const reactToPost = async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(400).json({ message: 'ID de publicación inválido' });

  const { reaction } = req.body;
  const userId = req.user.uid;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });

    if (!(await hasCarreraAccess(post, userId))) {
      return res.status(403).json({ message: 'No tienes acceso a esta publicación' });
    }

    const result   = await Reaction.toggle(postId, userId, reaction);
    const reactions = await Reaction.countsByPost(postId);

    return res.status(200).json({
      message:      result ? 'Reacción registrada' : 'Reacción eliminada',
      userReaction: result ? result.type : null,
      reactions,
    });
  } catch (error) {
    console.error('Error en reactToPost:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * POST /api/posts/:id/comments
 * Agrega un comentario a una publicación.
 * Add a comment to a post.
 *
 * Body: { content }
 * Response 201: { message, comment }
 *
 * @type {import('express').RequestHandler}
 */
const addComment = async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(400).json({ message: 'ID de publicación inválido' });

  const { content } = req.body;
  const userId = req.user.uid;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });

    if (!(await hasCarreraAccess(post, userId))) {
      return res.status(403).json({ message: 'No tienes acceso a esta publicación' });
    }

    const comment = await Comment.create({ postId, authorId: userId, content });

    return res.status(201).json({
      message: 'Comentario agregado',
      comment,
    });
  } catch (error) {
    console.error('Error en addComment:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/posts/:id/comments
 * Retorna los comentarios paginados de una publicación.
 * Return paginated comments for a post.
 *
 * Query: ?page=1 &limit=20
 * Response 200: { comments, total, page, totalPages }
 *
 * @type {import('express').RequestHandler}
 */
const getComments = async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(400).json({ message: 'ID de publicación inválido' });

  const { page = '1', limit = '20' } = req.query;
  const userId = req.user.uid;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });

    if (!(await hasCarreraAccess(post, userId))) {
      return res.status(403).json({ message: 'No tienes acceso a esta publicación' });
    }

    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    const { comments, total } = await Comment.findByPost(postId, pageNum, limitNum);

    return res.status(200).json({
      comments,
      total,
      page:       pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error en getComments:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  createPost,
  getFeed,
  getPost,
  updatePost,
  deletePost,
  reactToPost,
  addComment,
  getComments,
};
