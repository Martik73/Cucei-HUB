const { getDb } = require('../config/mongodb');

class Evaluation {
  /**
   * Retorna las evaluaciones de un profesor con filtros opcionales.
   * Return a professor's evaluations with optional filters.
   *
   * Incluye nombre del alumno (sin anonimato) y nombre de la materia.
   * Includes the student's name (non-anonymous) and subject name.
   *
   * @param {{ professorId: number, subjectId?: number|null, semestre?: number|null, page?: number, limit?: number }}
   * @returns {Promise<{ evaluations: Array, total: number, page: number, totalPages: number }>}
   */
  static async findByProfessor({ professorId, subjectId = null, semestre = null, page = 1, limit = 20 }) {
    const db = getDb();
    const offset = (page - 1) * limit;

    const conditions = ['e.professorId = ?'];
    const params = [professorId];

    if (subjectId) {
      conditions.push('e.subjectId = ?');
      params.push(subjectId);
    }
    if (semestre) {
      conditions.push('e.semestre = ?');
      params.push(semestre);
    }

    const where = conditions.join(' AND ');

    const countSql = `SELECT COUNT(*) AS total FROM evaluations e WHERE ${where}`;
    const dataSql  = `
      SELECT
        e.id, e.professorId, e.subjectId, e.studentId,
        e.rating, e.comment, e.semestre, e.createdAt,
        u.nombre  AS studentNombre,
        s.nombre  AS subjectNombre
      FROM evaluations e
      JOIN users    u ON u.id = e.studentId
      JOIN subjects s ON s.id = e.subjectId
      WHERE ${where}
      ORDER BY e.createdAt DESC
      LIMIT ? OFFSET ?`;

    return new Promise((resolve, reject) => {
      db.get(countSql, params, (err, countRow) => {
        if (err) return reject(err);
        db.all(dataSql, [...params, limit, offset], (err2, rows) => {
          if (err2) return reject(err2);
          const total = countRow.total;
          resolve({ evaluations: rows, total, page, totalPages: Math.ceil(total / limit) });
        });
      });
    });
  }

  /**
   * Crea una nueva evaluación.
   * Create a new evaluation row.
   *
   * Lanza error con code='DUPLICATE' si ya existe una evaluación del mismo
   * alumno para ese profesor y materia.
   *
   * @param {{ professorId, subjectId, studentId, rating, comment, semestre }}
   * @returns {Promise<Object>}
   */
  static async create({ professorId, subjectId, studentId, rating, comment, semestre }) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO evaluations (professorId, subjectId, studentId, rating, comment, semestre)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [professorId, subjectId, studentId, rating, comment || '', semestre],
        function (err) {
          if (err) {
            if (err.message?.includes('UNIQUE constraint')) {
              const dup = new Error('Ya evaluaste a este profesor en esta materia');
              dup.code = 'DUPLICATE';
              return reject(dup);
            }
            return reject(err);
          }
          db.get(
            `SELECT e.id, e.professorId, e.subjectId, e.studentId,
                    e.rating, e.comment, e.semestre, e.createdAt,
                    u.nombre AS studentNombre, s.nombre AS subjectNombre
             FROM evaluations e
             JOIN users    u ON u.id = e.studentId
             JOIN subjects s ON s.id = e.subjectId
             WHERE e.id = ?`,
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
}

module.exports = Evaluation;
