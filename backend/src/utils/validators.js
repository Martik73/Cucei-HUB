/**
 * Carreras válidas para el enum del modelo de usuario.
 * Valid degree programs for the user model enum.
 */
const CARRERAS = [
  'Ingeniería en Computación',
  'Ingeniería en Electrónica',
  'Ingeniería Eléctrica',
  'Ingeniería Industrial',
  'Ingeniería Mecánica',
  'Ingeniería Mecatrónica',
  'Ingeniería Química',
  'Ingeniería Biomédica',
  'Ingeniería Civil',
  'Ingeniería en Telecomunicaciones',
  'Licenciatura en Física',
  'Licenciatura en Química',
  'Licenciatura en Matemáticas',
];

/**
 * Valida que el email sea válido y pertenezca al dominio @alumnos.udg.mx.
 * Validates that email is valid and belongs to @alumnos.udg.mx domain.
 *
 * @param {string} email
 * @returns {boolean}
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.trim().endsWith('@alumnos.udg.mx');
};

/**
 * Valida que la contraseña tenga al menos 8 caracteres.
 * Validates that password has at least 8 characters.
 *
 * @param {string} password
 * @returns {boolean}
 */
const validatePassword = (password) => {
  return typeof password === 'string' && password.length >= 8;
};

/**
 * Valida que la carrera esté en el enum permitido.
 * Validates that carrera is in the allowed enum.
 *
 * @param {string} carrera
 * @returns {boolean}
 */
const validateCarrera = (carrera) => {
  return CARRERAS.includes(carrera);
};

module.exports = { validateEmail, validatePassword, validateCarrera, CARRERAS };
