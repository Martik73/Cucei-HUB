const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { validateEmail, validatePassword, validateCarrera, CARRERAS } = require('../utils/validators');

const SALT_ROUNDS = 12;

/**
 * Genera un JWT firmado con los datos del usuario.
 * Generate a signed JWT with user data.
 *
 * @param {import('../models/User').IUser} user
 * @returns {string}
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      uid: user.id,
      email: user.email,
      rol: user.rol,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * POST /api/auth/register
 * Registra un nuevo usuario institucional de CUCEI.
 * Register a new CUCEI institutional user.
 *
 * Body: { email, password, nombre, carrera, semestre, bio? }
 * Response 201: { message, token, user }
 * Response 400: validación fallida
 * Response 409: email duplicado
 * Response 500: error del servidor
 *
 * @type {import('express').RequestHandler}
 */
const register = async (req, res) => {
  const { email, password, nombre, carrera, semestre, bio } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({
      message: 'El correo debe ser un @alumnos.udg.mx válido',
    });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      message: 'La contraseña debe tener al menos 8 caracteres',
    });
  }

  if (!validateCarrera(carrera)) {
    return res.status(400).json({
      message: 'Carrera no válida',
      opciones: CARRERAS,
    });
  }

  try {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      firebaseUid: crypto.randomUUID(), // placeholder temporal hasta integrar Firebase Auth
      email,
      password: hashedPassword,
      nombre,
      carrera,
      semestre: Number(semestre),
      bio: bio || '',
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: User.toPublic(user),
    });
  } catch (error) {
    console.error('Error en register:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * POST /api/auth/login
 * Autentica al usuario con email y contraseña.
 * Authenticate user with email and password.
 *
 * Body: { email, password }
 * Response 200: { message, token, user }
 * Response 400: campos faltantes
 * Response 401: credenciales inválidas
 * Response 403: cuenta desactivada
 * Response 500: error del servidor
 *
 * @type {import('express').RequestHandler}
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findByEmail(email);

    // Mensaje genérico para no revelar si el email existe
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Cuenta desactivada. Contacta al administrador' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Login exitoso',
      token,
      user: User.toPublic(user),
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/auth/me
 * Retorna el perfil completo del usuario autenticado.
 * Return the full profile of the authenticated user.
 *
 * Headers: Authorization: Bearer <token>
 * Response 200: { user }
 * Response 404: usuario no encontrado en BD
 * Response 500: error del servidor
 *
 * @type {import('express').RequestHandler}
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.status(200).json({
      user: User.toPublic(user),
    });
  } catch (error) {
    console.error('Error en getProfile:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { register, login, getProfile };
