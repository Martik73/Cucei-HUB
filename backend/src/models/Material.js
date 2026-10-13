const { getDb } = require('../config/mongodb');

class Material {
  static async create({ communityId, uploaderId, titulo, descripcion, tipo, fileUrl, youtubeUrl }) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO materials (communityId, uploaderId, titulo, descripcion, tipo, fileUrl, youtubeUrl)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [communityId, uploaderId, titulo.trim(), descripcion?.trim() || '', tipo, fileUrl || null, youtubeUrl || null],
        function (err) {
          if (err) return reject(err);
          db.get(
            `SELECT m.*, u.nombre AS uploaderNombre, u.profilePicture AS uploaderPicture
             FROM materials m
             JOIN users u ON u.id = m.uploaderId
             WHERE m.id = ?`,
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

  static async findByCommunity(communityId) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT m.*, u.nombre AS uploaderNombre, u.profilePicture AS uploaderPicture
         FROM materials m
         JOIN users u ON u.id = m.uploaderId
         WHERE m.communityId = ?
         ORDER BY m.createdAt DESC`,
        [communityId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  }

  static async findById(id) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM materials WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  }

  static async delete(id) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM materials WHERE id = ?', [id], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

module.exports = Material;
