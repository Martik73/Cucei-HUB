const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { validateEmail, validatePassword, validateCarrera, CARRERAS } = require('../utils/validators');

const SALT_ROUNDS = 12;

const generateToken = (user) =>
  jwt.sign({ uid: user.id, email: user.email, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '7d' });

const register = async (req, res) => {
  const { email, password, nombre, carrera, semestre, bio } = req.body;

  if (!validateEmail(email))    return res.status(400).json({ message: 'El correo debe ser un @alumnos.udg.mx válido' });
  if (!validatePassword(password)) return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
  if (!validateCarrera(carrera))   return res.status(400).json({ message: 'Carrera no válida', opciones: CARRERAS });

  try {
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ message: 'El correo ya está registrado' });

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      firebaseUid: crypto.randomUUID(),
      email, password: hashedPassword, nombre, carrera,
      semestre: Number(semestre), bio: bio || '',
    });

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token: generateToken(user),
      user: User.toPublic(user),
    });
  } catch (error) {
    console.error('Error en register:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findByEmail(email);
    if (!user)           return res.status(401).json({ message: 'Credenciales inválidas' });
    if (!user.isActive)  return res.status(403).json({ message: 'Cuenta desactivada. Contacta al administrador' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });

    return res.status(200).json({
      message: 'Login exitoso',
      token: generateToken(user),
      user: User.toPublic(user),
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.status(200).json({ user: User.toPublic(user) });
  } catch (error) {
    console.error('Error en getProfile:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const updateProfile = async (req, res) => {
  const { nombre, bio, semestre } = req.body;
  const userId = req.user.uid;
  const updates = {};

  if (nombre !== undefined) {
    const trimmed = String(nombre).trim();
    if (trimmed.length < 2 || trimmed.length > 100)
      return res.status(400).json({ message: 'El nombre debe tener entre 2 y 100 caracteres' });
    updates.nombre = trimmed;
  }
  if (bio !== undefined) {
    if (String(bio).length > 300)
      return res.status(400).json({ message: 'La bio no puede superar 300 caracteres' });
    updates.bio = bio;
  }
  if (semestre !== undefined) {
    const s = Number(semestre);
    if (!Number.isInteger(s) || s < 1 || s > 12)
      return res.status(400).json({ message: 'El semestre debe ser entre 1 y 12' });
    updates.semestre = s;
  }

  if (Object.keys(updates).length === 0)
    return res.status(400).json({ message: 'No hay campos para actualizar' });

  try {
    const updated = await User.update(userId, updates);
    return res.status(200).json({ message: 'Perfil actualizado exitosamente', user: User.toPublic(updated) });
  } catch (error) {
    console.error('Error en updateProfile:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { register, login, getProfile, updateProfile };
