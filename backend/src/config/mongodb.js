const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

/**
 * Crea las tablas necesarias si no existen.
 * Create required tables if they don't already exist.
 *
 * @returns {Promise<void>}
 */
const initTables = () => {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        firebaseUid    TEXT    UNIQUE NOT NULL,
        email          TEXT    UNIQUE NOT NULL,
        password       TEXT    NOT NULL,
        nombre         TEXT    NOT NULL,
        carrera        TEXT    NOT NULL,
        semestre       INTEGER NOT NULL,
        bio            TEXT    DEFAULT '',
        profilePicture TEXT    DEFAULT '',
        rol            TEXT    DEFAULT 'student',
        isActive       INTEGER DEFAULT 1,
        createdAt      DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt      DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

/**
 * Conecta a SQLite y crea las tablas si no existen.
 * Connect to SQLite and initialize tables.
 *
 * @returns {Promise<void>}
 */
const connectMongoDB = async () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(
      path.join(__dirname, '../../cucei-hub.db'),
      async (err) => {
        if (err) {
          console.error('❌ Error al conectar SQLite:', err.message);
          return reject(err);
        }
        console.log('✅ SQLite conectado (desarrollo local)');
        try {
          await initTables();
          resolve();
        } catch (tableErr) {
          reject(tableErr);
        }
      }
    );
  });
};

/**
 * Retorna la instancia de la base de datos SQLite.
 * Return the SQLite database instance.
 *
 * @returns {sqlite3.Database}
 */
const getDb = () => db;

module.exports = { connectMongoDB, getDb };
