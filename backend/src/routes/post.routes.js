const { Router } = require('express');
const { body, query } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const {
  createPost, getFeed, getPost,
  updatePost, deletePost,
  reactToPost, addComment, getComments,
} = require('../controllers/post.controller');
const { POST_TYPES, POST_CATEGORIES, REACTION_TYPES } = require('../utils/postValidators');

const router = Router();

// Todas las rutas del módulo requieren autenticación JWT (@alumnos.udg.mx)
// All routes in this module require JWT auth (@alumnos.udg.mx)
router.use(verifyToken);

/**
 * POST /api/posts
 * Crear publicación. type='carrera' hereda la carrera del autor automáticamente.
 */
router.post(
  '/',
  [
    body('content')
      .trim()
      .notEmpty().withMessage('El contenido es requerido')
      .isLength({ max: 2000 }).withMessage('Máximo 2000 caracteres'),
    body('type')
      .isIn(POST_TYPES).withMessage(`type debe ser: ${POST_TYPES.join(', ')}`),
    body('category')
      .isIn(POST_CATEGORIES).withMessage(`category debe ser: ${POST_CATEGORIES.join(', ')}`),
  ],
  handleValidationErrors,
  createPost
);

/**
 * GET /api/posts
 * Feed con filtrado opcional. La lógica de carrera se aplica siempre, sin excepción.
 */
router.get(
  '/',
  [
    query('type').optional().isIn(POST_TYPES)
      .withMessage(`type debe ser: ${POST_TYPES.join(', ')}`),
    query('category').optional().isIn(POST_CATEGORIES)
      .withMessage(`category debe ser: ${POST_CATEGORIES.join(', ')}`),
    query('page').optional().isInt({ min: 1 }).withMessage('page debe ser entero ≥ 1'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit debe ser 1-50'),
  ],
  handleValidationErrors,
  getFeed
);

/**
 * GET /api/posts/:id
 * Publicación individual con reacciones y conteo de comentarios.
 */
router.get('/:id', getPost);

/**
 * PUT /api/posts/:id
 * Solo el autor puede editar. Solo content y category son editables.
 */
router.put(
  '/:id',
  [
    body('content')
      .optional()
      .trim()
      .notEmpty().withMessage('El contenido no puede estar vacío')
      .isLength({ max: 2000 }).withMessage('Máximo 2000 caracteres'),
    body('category')
      .optional()
      .isIn(POST_CATEGORIES).withMessage(`category debe ser: ${POST_CATEGORIES.join(', ')}`),
  ],
  handleValidationErrors,
  updatePost
);

/**
 * DELETE /api/posts/:id
 * Solo el autor o un admin pueden eliminar.
 */
router.delete('/:id', deletePost);

/**
 * POST /api/posts/:id/react
 * Toggle de reacción. Misma reacción = eliminar; distinta = reemplazar.
 */
router.post(
  '/:id/react',
  [
    body('reaction')
      .isIn(REACTION_TYPES).withMessage(`reaction debe ser: ${REACTION_TYPES.join(', ')}`),
  ],
  handleValidationErrors,
  reactToPost
);

/**
 * POST /api/posts/:id/comments
 * Agregar comentario a una publicación.
 */
router.post(
  '/:id/comments',
  [
    body('content')
      .trim()
      .notEmpty().withMessage('El comentario no puede estar vacío')
      .isLength({ max: 1000 }).withMessage('Máximo 1000 caracteres'),
  ],
  handleValidationErrors,
  addComment
);

/**
 * GET /api/posts/:id/comments
 * Lista paginada de comentarios.
 */
router.get('/:id/comments', getComments);

module.exports = router;
