const { getDb } = require('../config/mongodb');

class Community {
  static async create({ nombre, descripcion, materia, tema, carrera, creatorId }) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO communities (nombre, descripcion, materia, tema, carrera, creatorId)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nombre.trim(), descripcion?.trim() || '', materia?.trim() || '', tema?.trim() || '', carrera?.trim() || '', creatorId],
        function (err) {
          if (err) return reject(err);
          db.get('SELECT * FROM communities WHERE id = ?', [this.lastID], (err2, row) => {
            if (err2) return reject(err2);
            resolve(row);
          });
        }
      );
    });
  }

  static async findAll({ search = '', materia = '', carrera = '' } = {}) {
    const db = getDb();
    const conditions = ['1=1'];
    const params = [];

    if (search) {
      conditions.push("(c.nombre LIKE ? OR c.descripcion LIKE ? OR c.tema LIKE ?)");
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (materia) {
      conditions.push('c.materia = ?');
      params.push(materia);
    }
    if (carrera) {
      conditions.push('c.carrera = ?');
      params.push(carrera);
    }

    const where = conditions.join(' AND ');

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT
           c.*,
           u.nombre AS creatorNombre,
           (SELECT COUNT(*) FROM community_members cm WHERE cm.communityId = c.id) AS memberCount,
           (SELECT COUNT(*) FROM materials m WHERE m.communityId = c.id) AS materialCount
         FROM communities c
         JOIN users u ON u.id = c.creatorId
         WHERE ${where}
         ORDER BY c.createdAt DESC`,
        params,
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  }

  static async findById(id, userId = null) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT
           c.*,
           u.nombre AS creatorNombre,
           (SELECT COUNT(*) FROM community_members cm WHERE cm.communityId = c.id) AS memberCount,
           (SELECT COUNT(*) FROM materials m WHERE m.communityId = c.id) AS materialCount
           ${userId ? ', (SELECT COUNT(*) FROM community_members cm2 WHERE cm2.communityId = c.id AND cm2.userId = ?) AS isMember' : ''}
         FROM communities c
         JOIN users u ON u.id = c.creatorId
         WHERE c.id = ?`,
        userId ? [userId, id] : [id],
        (err, row) => {
          if (err) return reject(err);
          if (!row) return resolve(null);
          resolve({ ...row, isMember: userId ? row.isMember > 0 : false });
        }
      );
    });
  }

  static async isMember(communityId, userId) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT 1 FROM community_members WHERE communityId = ? AND userId = ?',
        [communityId, userId],
        (err, row) => {
          if (err) return reject(err);
          resolve(!!row);
        }
      );
    });
  }

  static async join(communityId, userId) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO community_members (communityId, userId) VALUES (?, ?)',
        [communityId, userId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  static async leave(communityId, userId) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM community_members WHERE communityId = ? AND userId = ?',
        [communityId, userId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }
}

module.exports = Community;
