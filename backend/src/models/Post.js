const { getDb } = require('../config/mongodb');

/**
 * @typedef {Object} IPost
 * @property {number}  id
 * @property {number}  authorId
 * @property {string}  content
 * @property {'general'|'carrera'} type
 * @property {'duda'|'evento'|'trabajo'|'general'} category
 * @property {string|null} carrera   - null cuando type='general'
 * @property {string}  createdAt
 * @property {string}  updatedAt
 */

class Post {
  /**
   * Crea una publicación nueva.
   * Create a new post row.
   *
   * @param {{ authorId: number, content: string, type: string, category: string, carrera: string|null }} data
   * @returns {Promise<IPost>}
   */
  static async create({ authorId, content, type, category, carrera = null }) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO posts (authorId, content, type, category, carrera)
         VALUES (?, ?, ?, ?, ?)`,
        [authorId, content.trim(), type, category, carrera],
        function (err) {
          if (err) return reject(err);
          db.get('SELECT * FROM posts WHERE id = ?', [this.lastID], (err2, row) => {
            if (err2) return reject(err2);
            resolve(row);
          });
        }
      );
    });
  }

  /**
   * Busca una publicación por ID (sin validar acceso por carrera).
   * Find a post by ID — does NOT enforce carrera access.
   *
   * @param {number} id
   * @returns {Promise<IPost|null>}
   */
  static async findById(id) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM posts WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  }

  /**
   * Retorna una publicación con metadatos del autor, conteos y reacción del usuario.
   * Return a post with author metadata, counts, and the requesting user's reaction.
   *
   * @param {number} id
   * @param {number} userId - used for userReaction subquery
   * @returns {Promise<IPost & Object | null>}
   */
  static async findWithDetails(id, userId) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT
           p.*,
           u.nombre         AS authorNombre,
           u.carrera        AS authorCarrera,
           u.profilePicture AS authorPicture,
           (SELECT COUNT(*) FROM reactions r  WHERE r.postId  = p.id)                   AS totalReactions,
           (SELECT COUNT(*) FROM comments  c  WHERE c.postId  = p.id)                   AS commentCount,
           (SELECT r2.type  FROM reactions r2 WHERE r2.postId = p.id AND r2.userId = ?) AS userReaction
         FROM posts p
         JOIN users u ON u.id = p.authorId
         WHERE p.id = ?`,
        [userId, id],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        }
      );
    });
  }

  /**
   * CRÍTICO: Retorna el feed paginado con filtrado estricto por carrera.
   * CRITICAL: Return paginated feed with strict carrera filtering.
   *
   * Regla de visibilidad:
   * - type='general'  → visible para todos
   * - type='carrera'  → SOLO visible para usuarios con la MISMA carrera
   *
   * @param {{ userId: number, userCarrera: string, type?: string, category?: string, page?: number, limit?: number }}
   * @returns {Promise<{ posts: IPost[], total: number }>}
   */
  static async findFeed({ userId, userCarrera, type = null, category = null, page = 1, limit = 20 }) {
    const db = getDb();
    const offset = (page - 1) * limit;

    // Base: enforce carrera isolation at SQL level
    // Single quotes are required — SQLite interprets double quotes as identifiers, not literals
    const conditions = ["(p.type = 'general' OR (p.type = 'carrera' AND p.carrera = ?))"];
    const whereParams = [userCarrera];

    if (type) {
      conditions.push('p.type = ?');
      whereParams.push(type);
    }
    if (category) {
      conditions.push('p.category = ?');
      whereParams.push(category);
    }

    const where = conditions.join(' AND ');

    const countSql = `SELECT COUNT(*) AS total FROM posts p WHERE ${where}`;

    const dataSql = `
      SELECT
        p.*,
        u.nombre         AS authorNombre,
        u.carrera        AS authorCarrera,
        u.profilePicture AS authorPicture,
        (SELECT COUNT(*) FROM reactions r  WHERE r.postId  = p.id)                   AS reactionCount,
        (SELECT COUNT(*) FROM comments  c  WHERE c.postId  = p.id)                   AS commentCount,
        (SELECT r2.type  FROM reactions r2 WHERE r2.postId = p.id AND r2.userId = ?) AS userReaction
      FROM posts p
      JOIN users u ON u.id = p.authorId
      WHERE ${where}
      ORDER BY p.createdAt DESC
      LIMIT ? OFFSET ?`;

    // userId is first param (SELECT subquery), then whereParams, then pagination
    const dataParams = [userId, ...whereParams, limit, offset];

    return new Promise((resolve, reject) => {
      db.get(countSql, whereParams, (err, countRow) => {
        if (err) return reject(err);
        db.all(dataSql, dataParams, (err2, rows) => {
          if (err2) return reject(err2);
          resolve({ posts: rows, total: countRow.total });
        });
      });
    });
  }

  /**
   * Actualiza contenido y/o categoría de una publicación.
   * Update content and/or category of a post.
   *
   * @param {number} id
   * @param {{ content?: string, category?: string }} data
   * @returns {Promise<IPost>}
   */
  static async update(id, { content, category }) {
    const db = getDb();
    const sets = ['updatedAt = CURRENT_TIMESTAMP'];
    const params = [];

    if (content !== undefined) {
      sets.unshift('content = ?');
      params.push(content.trim());
    }
    if (category !== undefined) {
      sets.unshift('category = ?');
      params.push(category);
    }

    params.push(id);

    return new Promise((resolve, reject) => {
      db.run(`UPDATE posts SET ${sets.join(', ')} WHERE id = ?`, params, function (err) {
        if (err) return reject(err);
        db.get('SELECT * FROM posts WHERE id = ?', [id], (err2, row) => {
          if (err2) return reject(err2);
          resolve(row);
        });
      });
    });
  }

  /**
   * Retorna las publicaciones paginadas de un autor específico, respetando la
   * visibilidad por carrera del usuario que las solicita.
   * Return paginated posts from a specific author, respecting carrera visibility rules.
   *
   * @param {{ authorId: number, currentUserId: number, currentUserCarrera: string, page?: number, limit?: number }}
   * @returns {Promise<{ posts: IPost[], total: number, page: number, totalPages: number }>}
   */
  static async findByUser({ authorId, currentUserId, currentUserCarrera, page = 1, limit = 20 }) {
    const db = getDb();
    const offset = (page - 1) * limit;

    const where = `p.authorId = ? AND (p.type = 'general' OR (p.type = 'carrera' AND p.carrera = ?))`;
    const whereParams = [authorId, currentUserCarrera];

    const countSql = `SELECT COUNT(*) AS total FROM posts p WHERE ${where}`;

    const dataSql = `
      SELECT
        p.*,
        u.nombre         AS authorNombre,
        u.carrera        AS authorCarrera,
        u.profilePicture AS authorPicture,
        (SELECT COUNT(*) FROM reactions r  WHERE r.postId  = p.id)                   AS reactionCount,
        (SELECT COUNT(*) FROM comments  c  WHERE c.postId  = p.id)                   AS commentCount,
        (SELECT r2.type  FROM reactions r2 WHERE r2.postId = p.id AND r2.userId = ?) AS userReaction
      FROM posts p
      JOIN users u ON u.id = p.authorId
      WHERE ${where}
      ORDER BY p.createdAt DESC
      LIMIT ? OFFSET ?`;

    const dataParams = [currentUserId, ...whereParams, limit, offset];

    return new Promise((resolve, reject) => {
      db.get(countSql, whereParams, (err, countRow) => {
        if (err) return reject(err);
        db.all(dataSql, dataParams, (err2, rows) => {
          if (err2) return reject(err2);
          const total = countRow.total;
          resolve({
            posts: rows,
            total,
            page,
            totalPages: Math.ceil(total / limit),
          });
        });
      });
    });
  }

  /**
   * Elimina una publicación (CASCADE borra comentarios y reacciones).
   * Delete a post — CASCADE removes its comments and reactions.
   *
   * @param {number} id
   * @returns {Promise<void>}
   */
  static async delete(id) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM posts WHERE id = ?', [id], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

module.exports = Post;
