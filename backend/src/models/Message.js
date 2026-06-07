const { getDb } = require('../config/mongodb');

/**
 * @typedef {Object} IMessage
 * @property {number}  id
 * @property {number}  senderId
 * @property {number}  receiverId
 * @property {string}  content
 * @property {number}  read       - 0 = no leído, 1 = leído
 * @property {string}  createdAt
 */

class Message {
  /**
   * Crea y persiste un nuevo mensaje.
   * Create and persist a new message.
   *
   * @param {{ senderId: number, receiverId: number, content: string }}
   * @returns {Promise<IMessage>}
   */
  static async create({ senderId, receiverId, content }) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO messages (senderId, receiverId, content) VALUES (?, ?, ?)',
        [senderId, receiverId, content.trim()],
        function (err) {
          if (err) return reject(err);
          db.get('SELECT * FROM messages WHERE id = ?', [this.lastID], (err2, row) => {
            if (err2) return reject(err2);
            resolve(row);
          });
        }
      );
    });
  }

  /**
   * Retorna el historial paginado entre dos usuarios, ordenado ASC (más antiguo primero).
   * Return paginated conversation history between two users, ASC order.
   *
   * @param {number} userAId
   * @param {number} userBId
   * @param {number} page
   * @param {number} limit
   * @returns {Promise<{ messages: IMessage[], total: number }>}
   */
  static async findConversation(userAId, userBId, page = 1, limit = 20) {
    const db  = getDb();
    const off = (page - 1) * limit;

    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) AS total FROM messages
         WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)`,
        [userAId, userBId, userBId, userAId],
        (err, countRow) => {
          if (err) return reject(err);

          db.all(
            `SELECT
               m.*,
               s.nombre         AS senderNombre,
               s.profilePicture AS senderPicture,
               r.nombre         AS receiverNombre,
               r.profilePicture AS receiverPicture
             FROM messages m
             JOIN users s ON s.id = m.senderId
             JOIN users r ON r.id = m.receiverId
             WHERE (m.senderId = ? AND m.receiverId = ?)
                OR (m.senderId = ? AND m.receiverId = ?)
             ORDER BY m.createdAt ASC
             LIMIT ? OFFSET ?`,
            [userAId, userBId, userBId, userAId, limit, off],
            (err2, rows) => {
              if (err2) return reject(err2);
              resolve({ messages: rows, total: countRow.total });
            }
          );
        }
      );
    });
  }

  /**
   * Marca como leídos todos los mensajes de senderId hacia receiverId.
   * Mark all messages from senderId to receiverId as read.
   *
   * @param {number} senderId   - quien envió los mensajes
   * @param {number} receiverId - quien los está leyendo
   * @returns {Promise<{ changed: number }>}
   */
  static async markAsRead(senderId, receiverId) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE messages SET read = 1 WHERE senderId = ? AND receiverId = ? AND read = 0',
        [senderId, receiverId],
        function (err) {
          if (err) return reject(err);
          resolve({ changed: this.changes });
        }
      );
    });
  }

  /**
   * Retorna la lista de conversaciones únicas del usuario con el último mensaje
   * y el conteo de mensajes no leídos.
   * Return unique conversations for a user with last message and unread count.
   *
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  static async getConversations(userId) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      // Subconsulta: por cada conversación (partner único), obtener el ID del último mensaje
      // Subquery: for each unique partner, get the ID of the latest message
      db.all(
        `SELECT
           u.id             AS userId,
           u.nombre,
           u.email,
           u.profilePicture,
           u.carrera,
           m.id             AS lastMessageId,
           m.content        AS lastContent,
           m.senderId       AS lastSenderId,
           m.read           AS lastRead,
           m.createdAt      AS lastCreatedAt,
           (SELECT COUNT(*) FROM messages
            WHERE senderId = u.id AND receiverId = ? AND read = 0) AS unreadCount
         FROM (
           SELECT
             CASE WHEN senderId = ? THEN receiverId ELSE senderId END AS partnerId,
             MAX(id) AS lastId
           FROM messages
           WHERE senderId = ? OR receiverId = ?
           GROUP BY CASE WHEN senderId = ? THEN receiverId ELSE senderId END
         ) conv
         JOIN messages m ON m.id = conv.lastId
         JOIN users   u ON u.id = conv.partnerId
         ORDER BY m.createdAt DESC`,
        [userId, userId, userId, userId, userId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  }
}

module.exports = Message;
