const { Router } = require('express');
const { query }  = require('express-validator');
const { verifyToken }            = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { getConversations, getHistory } = require('../controllers/message.controller');

const router = Router();

// Todas las rutas del módulo requieren autenticación JWT (@alumnos.udg.mx)
// All routes require JWT auth (@alumnos.udg.mx)
router.use(verifyToken);

/**
 * GET /api/messages/conversations
 * Lista de conversaciones con último mensaje y conteo de no leídos.
 */
router.get('/conversations', getConversations);

/**
 * GET /api/messages/:userId
 * Historial paginado entre el usuario autenticado y :userId.
 */
router.get(
  '/:userId',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('page debe ser entero ≥ 1'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit debe ser 1-50'),
  ],
  handleValidationErrors,
  getHistory
);

module.exports = router;
