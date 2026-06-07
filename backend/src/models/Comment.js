const { getDb } = require('../config/mongodb');

/**
 * @typedef {Object} IComment
 * @property {number} id
 * @property {number} postId
 * @property {number} authorId
 * @property {string} content
 * @property {string} createdAt
 */

class Comment {
  /**
   * Crea un comentario en una publicación.
   * Create a comment on a post.
   *
   * @param {{ postId: number, authorId: number, content: string }}
   * @returns {Promise<IComment & { authorNombre: string, authorPicture: string }>}
   */
  static async create({ postId, authorId, content }) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO comments (postId, authorId, content) VALUES (?, ?, ?)',
        [postId, authorId, content.trim()],
        function (err) {
          if (err) return reject(err);
          db.get(
            `SELECT c.*, u.nombre AS authorNombre, u.profilePicture AS authorPicture
             FROM comments c
             JOIN users u ON u.id = c.authorId
             WHERE c.id = ?`,
            [this.lastID],
            (err2, row) => {
              if (err2) return reject(err2);
              resolve(row);
            }
          );
        }
      );
    });
  }

  /**
   * Retorna comentarios paginados de un post, con info del autor.
   * Return paginated comments for a post with author info.
   *
   * @param {number} postId
   * @param {number} page
   * @param {number} limit
   * @returns {Promise<{ comments: IComment[], total: number }>}
   */
  static async findByPost(postId, page = 1, limit = 20) {
    const db = getDb();
    const offset = (page - 1) * limit;

    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) AS total FROM comments WHERE postId = ?', [postId], (err, countRow) => {
        if (err) return reject(err);
        db.all(
          `SELECT c.*, u.nombre AS authorNombre, u.profilePicture AS authorPicture
           FROM comments c
           JOIN users u ON u.id = c.authorId
           WHERE c.postId = ?
           ORDER BY c.createdAt ASC
           LIMIT ? OFFSET ?`,
          [postId, limit, offset],
          (err2, rows) => {
            if (err2) return reject(err2);
            resolve({ comments: rows, total: countRow.total });
          }
        );
      });
    });
  }
}

module.exports = Comment;
