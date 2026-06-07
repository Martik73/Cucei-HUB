const { Router } = require('express');
const { body } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { register, login, getProfile, updateProfile } = require('../controllers/auth.controller');

const router = Router();

/**
 * POST /api/auth/register
 * Registra un nuevo usuario institucional. No requiere autenticación previa.
 * Register a new institutional user. No prior authentication required.
 *
 * Body: { email, password, nombre, carrera, semestre, bio? }
 */
router.post(
  '/register',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('El email es requerido')
      .isEmail().withMessage('Formato de email inválido'),
    body('password')
      .notEmpty().withMessage('La contraseña es requerida')
      .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('nombre')
      .trim()
      .notEmpty().withMessage('El nombre es requerido')
      .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
    body('carrera')
      .trim()
      .notEmpty().withMessage('La carrera es requerida'),
    body('semestre')
      .isInt({ min: 1, max: 12 }).withMessage('El semestre debe ser entre 1 y 12'),
    body('bio')
      .optional()
      .isLength({ max: 300 }).withMessage('La bio no puede superar 300 caracteres'),
  ],
  handleValidationErrors,
  register
);

/**
 * POST /api/auth/login
 * Autentica al usuario con email y contraseña. Retorna un JWT.
 * Authenticate user with email/password. Returns a JWT.
 *
 * Body: { email, password }
 */
router.post(
  '/login',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('El email es requerido'),
    body('password')
      .notEmpty().withMessage('La contraseña es requerida'),
  ],
  handleValidationErrors,
  login
);

/**
 * GET /api/auth/me
 * Retorna el perfil completo del usuario autenticado.
 * Return the full profile of the authenticated user.
 *
 * Headers: Authorization: Bearer <token>
 */
router.get('/me', verifyToken, getProfile);

/**
 * PUT /api/auth/profile
 * Actualiza el perfil del usuario autenticado.
 * Update the authenticated user's profile.
 *
 * Headers: Authorization: Bearer <token>
 * Body: { nombre?, bio?, semestre? }
 */
router.put(
  '/profile',
  verifyToken,
  [
    body('nombre')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('bio')
      .optional()
      .isLength({ max: 300 }).withMessage('La bio no puede superar 300 caracteres'),
    body('semestre')
      .optional()
      .isInt({ min: 1, max: 12 }).withMessage('El semestre debe ser entre 1 y 12'),
  ],
  handleValidationErrors,
  updateProfile
);

module.exports = router;
