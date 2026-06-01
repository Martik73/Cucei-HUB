const { getDb } = require('../config/mongodb');
const { CARRERAS } = require('../utils/validators');

/**
 * @typedef {Object} IUser
 * @property {number}  id              - ID autoincremental de SQLite
 * @property {string}  firebaseUid     - UID de Firebase Auth (llave única)
 * @property {string}  email           - Correo @alumnos.udg.mx
 * @property {string}  password        - Hash bcrypt de la contraseña
 * @property {string}  nombre          - Nombre completo
 * @property {string}  carrera         - Carrera registrada
 * @property {number}  semestre        - Semestre actual (1-12)
 * @property {string}  bio             - Descripción del perfil (opcional)
 * @property {string}  profilePicture  - URL de foto de perfil (opcional)
 * @property {'student'|'admin'} rol   - Rol del usuario
 * @property {number}  isActive        - 1 activo / 0 desactivado
 * @property {string}  createdAt
 * @property {string}  updatedAt
 */

class User {
  /**
   * Crea un nuevo usuario en SQLite.
   * Create a new user row in SQLite.
   *
   * @param {Omit<IUser, 'id'|'createdAt'|'updatedAt'>} data
   * @returns {Promise<IUser>}
   */
  static async create(data) {
    const db = getDb();
    const {
      firebaseUid,
      email,
      password,
      nombre,
      carrera,
      semestre,
      bio = '',
      profilePicture = '',
      rol = 'student',
    } = data;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users
           (firebaseUid, email, password, nombre, carrera, semestre, bio, profilePicture, rol)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [firebaseUid, email.toLowerCase(), password, nombre.trim(), carrera, semestre, bio, profilePicture, rol],
        function (err) {
          if (err) return reject(err);
          db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err2, row) => {
            if (err2) return reject(err2);
            resolve(row);
          });
        }
      );
    });
  }

  /**
   * Busca un usuario por email.
   * Find a user by email address.
   *
   * @param {string} email
   * @returns {Promise<IUser|null>}
   */
  static async findByEmail(email) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE email = ?',
        [email.toLowerCase()],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        }
      );
    });
  }

  /**
   * Busca un usuario por su UID de Firebase.
   * Find a user by Firebase UID.
   *
   * @param {string} uid
   * @returns {Promise<IUser|null>}
   */
  static async findByFirebaseUid(uid) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE firebaseUid = ?',
        [uid],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        }
      );
    });
  }

  /**
   * Retorna el usuario sin campos sensibles (password).
   * Return user object without sensitive fields.
   *
   * @param {IUser} user
   * @returns {Omit<IUser, 'password'>|null}
   */
  static toPublic(user) {
    if (!user) return null;
    // eslint-disable-next-line no-unused-vars
    const { password, ...publicUser } = user;
    return publicUser;
  }
}

User.CARRERAS = CARRERAS;

module.exports = User;
