const jwt = require('jsonwebtoken');

/**
 * Middleware que verifica el JWT del header Authorization.
 * Valida que el correo del token pertenezca a @alumnos.udg.mx.
 * Verify JWT from Authorization header and enforce institutional email domain.
 *
 * Headers requeridos: Authorization: Bearer <token>
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 *
 * @returns {void}
 * - 401 si el token falta o es inválido/expirado
 * - 403 si el correo no es @alumnos.udg.mx
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de autenticación requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.email?.endsWith('@alumnos.udg.mx')) {
      return res.status(403).json({
        message: 'Solo se permiten correos institucionales (@alumnos.udg.mx)',
      });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

// Alias para compatibilidad con código existente
const verifyFirebaseToken = verifyToken;

module.exports = { verifyToken, verifyFirebaseToken };
