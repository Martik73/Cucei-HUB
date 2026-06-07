const { getDb } = require('../config/mongodb');

/**
 * @typedef {Object} IReaction
 * @property {number} id
 * @property {number} postId
 * @property {number} userId
 * @property {'like'|'love'|'celebrate'} type
 * @property {string} createdAt
 */

class Reaction {
  /**
   * Busca la reacción de un usuario en un post.
   * Find a user's reaction on a post.
   *
   * @param {number} postId
   * @param {number} userId
   * @returns {Promise<IReaction|null>}
   */
  static async findByPostAndUser(postId, userId) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM reactions WHERE postId = ? AND userId = ?',
        [postId, userId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        }
      );
    });
  }

  /**
   * Toggle de reacción:
   * - Sin reacción previa → crea la nueva
   * - Misma reacción → la elimina (toggle off)
   * - Reacción distinta → la reemplaza
   *
   * Toggle reaction: add, remove (same type = toggle off), or replace (different type).
   *
   * @param {number} postId
   * @param {number} userId
   * @param {'like'|'love'|'celebrate'} type
   * @returns {Promise<IReaction|null>} null cuando se eliminó la reacción
   */
  static async toggle(postId, userId, type) {
    const db = getDb();
    const existing = await Reaction.findByPostAndUser(postId, userId);

    if (!existing) {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO reactions (postId, userId, type) VALUES (?, ?, ?)',
          [postId, userId, type],
          function (err) {
            if (err) return reject(err);
            db.get('SELECT * FROM reactions WHERE id = ?', [this.lastID], (err2, row) => {
              if (err2) return reject(err2);
              resolve(row);
            });
          }
        );
      });
    }

    if (existing.type === type) {
      // Misma reacción → eliminar (toggle off)
      return new Promise((resolve, reject) => {
        db.run('DELETE FROM reactions WHERE id = ?', [existing.id], (err) => {
          if (err) return reject(err);
          resolve(null);
        });
      });
    }

    // Reacción distinta → actualizar
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE reactions SET type = ? WHERE id = ?',
        [type, existing.id],
        (err) => {
          if (err) return reject(err);
          db.get('SELECT * FROM reactions WHERE id = ?', [existing.id], (err2, row) => {
            if (err2) return reject(err2);
            resolve(row);
          });
        }
      );
    });
  }

  /**
   * Retorna los conteos de reacciones agrupados por tipo para un post.
   * Return reaction counts grouped by type for a post.
   *
   * @param {number} postId
   * @returns {Promise<{ like: number, love: number, celebrate: number }>}
   */
  static async countsByPost(postId) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT type, COUNT(*) AS count FROM reactions WHERE postId = ? GROUP BY type',
        [postId],
        (err, rows) => {
          if (err) return reject(err);
          const counts = { like: 0, love: 0, celebrate: 0 };
          rows.forEach((r) => {
            if (r.type in counts) counts[r.type] = r.count;
          });
          resolve(counts);
        }
      );
    });
  }
}

module.exports = Reaction;
