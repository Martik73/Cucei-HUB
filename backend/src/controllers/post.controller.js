const { Types } = require('mongoose');
const User     = require('../models/User');
const Post     = require('../models/Post');
const Comment  = require('../models/Comment');
const Reaction = require('../models/Reaction');
const { validatePostType, validatePostCategory, validateReactionType } = require('../utils/postValidators');

const parseId = (raw) => Types.ObjectId.isValid(raw) ? raw : null;

const hasCarreraAccess = async (post, userId) => {
  if (post.type !== 'carrera') return true;
  const user = await User.findById(userId);
  return user?.carrera === post.carrera;
};

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
    return res.status(201).json({ message: 'Publicación creada exitosamente', post });
  } catch (error) {
    console.error('Error en createPost:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const getFeed = async (req, res) => {
  const userId = req.user.uid;
  const { type, category, page = '1', limit = '20' } = req.query;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    const { posts, total } = await Post.findFeed({
      userId, userCarrera: user.carrera,
      type: type || null, category: category || null,
      page: pageNum, limit: limitNum,
    });
    return res.status(200).json({ posts, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    console.error('Error en getFeed:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const getPost = async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(400).json({ message: 'ID de publicación inválido' });
  const userId = req.user.uid;
  try {
    const post = await Post.findWithDetails(postId, userId);
    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });
    if (!(await hasCarreraAccess(post, userId)))
      return res.status(403).json({ message: 'No tienes acceso a esta publicación' });

    const reactions = await Reaction.countsByPost(postId);
    return res.status(200).json({ post: { ...post, reactions } });
  } catch (error) {
    console.error('Error en getPost:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const updatePost = async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(400).json({ message: 'ID de publicación inválido' });
  const { content, category } = req.body;
  const userId = req.user.uid;
  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });
    if (post.authorId !== userId)
      return res.status(403).json({ message: 'Solo el autor puede editar esta publicación' });

    const updated = await Post.update(postId, { content, category });
    return res.status(200).json({ message: 'Publicación actualizada', post: updated });
  } catch (error) {
    console.error('Error en updatePost:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const deletePost = async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(400).json({ message: 'ID de publicación inválido' });
  const userId = req.user.uid;
  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });
    if (post.authorId !== userId && req.user.rol !== 'admin')
      return res.status(403).json({ message: 'No tienes permiso para eliminar esta publicación' });

    await Post.delete(postId);
    return res.status(200).json({ message: 'Publicación eliminada exitosamente' });
  } catch (error) {
    console.error('Error en deletePost:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const reactToPost = async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(400).json({ message: 'ID de publicación inválido' });
  const { reaction } = req.body;
  const userId = req.user.uid;
  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });
    if (!(await hasCarreraAccess(post, userId)))
      return res.status(403).json({ message: 'No tienes acceso a esta publicación' });

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

const addComment = async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(400).json({ message: 'ID de publicación inválido' });
  const { content } = req.body;
  const userId = req.user.uid;
  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });
    if (!(await hasCarreraAccess(post, userId)))
      return res.status(403).json({ message: 'No tienes acceso a esta publicación' });

    const comment = await Comment.create({ postId, authorId: userId, content });
    return res.status(201).json({ message: 'Comentario agregado', comment });
  } catch (error) {
    console.error('Error en addComment:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const getComments = async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(400).json({ message: 'ID de publicación inválido' });
  const { page = '1', limit = '20' } = req.query;
  const userId = req.user.uid;
  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });
    if (!(await hasCarreraAccess(post, userId)))
      return res.status(403).json({ message: 'No tienes acceso a esta publicación' });

    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const { comments, total } = await Comment.findByPost(postId, pageNum, limitNum);
    return res.status(200).json({ comments, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    console.error('Error en getComments:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { createPost, getFeed, getPost, updatePost, deletePost, reactToPost, addComment, getComments };
