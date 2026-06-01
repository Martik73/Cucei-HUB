const { admin } = require('../config/firebase');

/**
 * Crea un nuevo usuario en Firebase Auth.
 * Create a new user in Firebase Auth.
 *
 * @param {string} email - Correo institucional @alumnos.udg.mx
 * @param {string} password - Contraseña en texto plano (Firebase la almacena segura)
 * @returns {Promise<import('firebase-admin').auth.UserRecord>}
 */
const createUserInFirebase = async (email, password) => {
  return admin.auth().createUser({
    email,
    password,
    emailVerified: false,
  });
};

/**
 * Elimina un usuario de Firebase Auth.
 * Usado para rollback si falla el registro en la base de datos local.
 * Delete a user from Firebase Auth — used as rollback on local DB failure.
 *
 * @param {string} firebaseUid
 * @returns {Promise<void>}
 */
const deleteUserFromFirebase = async (firebaseUid) => {
  return admin.auth().deleteUser(firebaseUid);
};

module.exports = { createUserInFirebase, deleteUserFromFirebase };
