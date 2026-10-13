const { getDb } = require('../config/mongodb');

class CommunityMessage {
  static async create({ communityId, userId, content }) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO community_messages (communityId, userId, content) VALUES (?, ?, ?)',
        [communityId, userId, content.trim()],
        function (err) {
          if (err) return reject(err);
          db.get(
            `SELECT cm.*, u.nombre AS userNombre, u.profilePicture AS userPicture
             FROM community_messages cm
             JOIN users u ON u.id = cm.userId
             WHERE cm.id = ?`,
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

  static async findByCommunity(communityId, { page = 1, limit = 50 } = {}) {
    const db = getDb();
    const offset = (page - 1) * limit;
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) AS total FROM community_messages WHERE communityId = ?',
        [communityId],
        (err, countRow) => {
          if (err) return reject(err);
          db.all(
            `SELECT cm.*, u.nombre AS userNombre, u.profilePicture AS userPicture
             FROM community_messages cm
             JOIN users u ON u.id = cm.userId
             WHERE cm.communityId = ?
             ORDER BY cm.createdAt ASC
             LIMIT ? OFFSET ?`,
            [communityId, limit, offset],
            (err2, rows) => {
              if (err2) return reject(err2);
              resolve({ messages: rows, total: countRow.total, page, totalPages: Math.ceil(countRow.total / limit) });
            }
          );
        }
      );
    });
  }
}

module.exports = CommunityMessage;
