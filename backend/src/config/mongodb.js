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
 * Crea la tabla de mensajes y sus índices.
 * Create messages table and indexes.
 *
 * @returns {Promise<void>}
 */
const initMessageTables = () => {
  return new Promise((resolve, reject) => {
    db.exec(
      `
      CREATE TABLE IF NOT EXISTS messages (
        id         INTEGER  PRIMARY KEY AUTOINCREMENT,
        senderId   INTEGER  NOT NULL,
        receiverId INTEGER  NOT NULL,
        content    TEXT     NOT NULL,
        read       INTEGER  DEFAULT 0,
        createdAt  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (senderId)   REFERENCES users(id),
        FOREIGN KEY (receiverId) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(senderId);
      CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiverId);
      CREATE INDEX IF NOT EXISTS idx_messages_pair     ON messages(senderId, receiverId, createdAt);
      `,
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

/**
 * Crea las tablas del módulo de evaluación docente.
 * Create professor evaluation tables.
 *
 * @returns {Promise<void>}
 */
const initEvaluationTables = () => {
  return new Promise((resolve, reject) => {
    db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
      if (pragmaErr) return reject(pragmaErr);
      db.exec(
        `
        CREATE TABLE IF NOT EXISTS professors (
          id               INTEGER  PRIMARY KEY AUTOINCREMENT,
          nombre           TEXT     NOT NULL,
          departamento     TEXT     NOT NULL DEFAULT '',
          avgRating        REAL     DEFAULT 0,
          totalEvaluations INTEGER  DEFAULT 0,
          createdAt        DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS subjects (
          id      INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre  TEXT    NOT NULL,
          carrera TEXT    NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS professor_subjects (
          professorId INTEGER NOT NULL,
          subjectId   INTEGER NOT NULL,
          PRIMARY KEY (professorId, subjectId),
          FOREIGN KEY (professorId) REFERENCES professors(id) ON DELETE CASCADE,
          FOREIGN KEY (subjectId)   REFERENCES subjects(id)   ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS evaluations (
          id          INTEGER  PRIMARY KEY AUTOINCREMENT,
          professorId INTEGER  NOT NULL,
          subjectId   INTEGER  NOT NULL,
          studentId   INTEGER  NOT NULL,
          rating      INTEGER  NOT NULL,
          comment     TEXT     DEFAULT '',
          semestre    INTEGER  NOT NULL,
          createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (professorId, subjectId, studentId),
          FOREIGN KEY (professorId) REFERENCES professors(id) ON DELETE CASCADE,
          FOREIGN KEY (subjectId)   REFERENCES subjects(id),
          FOREIGN KEY (studentId)   REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_evaluations_prof    ON evaluations(professorId);
        CREATE INDEX IF NOT EXISTS idx_evaluations_student ON evaluations(studentId);
        CREATE INDEX IF NOT EXISTS idx_evaluations_subject ON evaluations(subjectId);
        CREATE INDEX IF NOT EXISTS idx_professors_nombre   ON professors(nombre);
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
          await initMessageTables();
          await initEvaluationTables();
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
