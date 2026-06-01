const { validationResult } = require('express-validator');

/**
 * Middleware para manejar errores de validación de express-validator.
 * Colocar después de las reglas de validación en las rutas.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Middleware global de manejo de errores (colocar al final de Express).
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const globalErrorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';

  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err.stack);
  }

  res.status(status).json({ message });
};

module.exports = { handleValidationErrors, globalErrorHandler };
