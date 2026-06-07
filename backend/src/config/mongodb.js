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
 * Crea las tablas del módulo de publicaciones y sus índices.
 * Create posts, comments, reactions tables and indexes.
 *
 * @returns {Promise<void>}
 */
const initPostTables = () => {
  return new Promise((resolve, reject) => {
    // PRAGMA necesario para que ON DELETE CASCADE funcione en SQLite
    db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
      if (pragmaErr) return reject(pragmaErr);

      db.exec(
        `
        CREATE TABLE IF NOT EXISTS posts (
          id        INTEGER  PRIMARY KEY AUTOINCREMENT,
          authorId  INTEGER  NOT NULL,
          content   TEXT     NOT NULL,
          type      TEXT     NOT NULL DEFAULT 'general',
          category  TEXT     NOT NULL DEFAULT 'general',
          carrera   TEXT     DEFAULT  NULL,
          createdAt DATETIME DEFAULT  CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT  CURRENT_TIMESTAMP,
          FOREIGN KEY (authorId) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS comments (
          id        INTEGER  PRIMARY KEY AUTOINCREMENT,
          postId    INTEGER  NOT NULL,
          authorId  INTEGER  NOT NULL,
          content   TEXT     NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (postId)   REFERENCES posts(id) ON DELETE CASCADE,
          FOREIGN KEY (authorId) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS reactions (
          id        INTEGER  PRIMARY KEY AUTOINCREMENT,
          postId    INTEGER  NOT NULL,
          userId    INTEGER  NOT NULL,
          type      TEXT     NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (postId, userId),
          FOREIGN KEY (postId)  REFERENCES posts(id) ON DELETE CASCADE,
          FOREIGN KEY (userId)  REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_posts_type     ON posts(type);
        CREATE INDEX IF NOT EXISTS idx_posts_carrera  ON posts(carrera);
        CREATE INDEX IF NOT EXISTS idx_posts_authorId ON posts(authorId);
        CREATE INDEX IF NOT EXISTS idx_posts_created  ON posts(createdAt DESC);
        CREATE INDEX IF NOT EXISTS idx_comments_post  ON comments(postId);
        CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(postId);
        CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(userId);
        `,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
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
          await initPostTables();
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
