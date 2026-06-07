const { getDb } = require('../config/mongodb');

class Professor {
  /**
   * Lista profesores con filtros opcionales de búsqueda, materia y semestre.
   * List professors with optional search, subject and semester filters.
   *
   * @param {{ search?: string, subjectId?: number|null, semestre?: number|null }}
   * @returns {Promise<Array>}
   */
  static async findAll({ search = '', subjectId = null, semestre = null } = {}) {
    const db = getDb();
    const conditions = [];
    const params = [];
    let joins = '';

    if (subjectId && semestre) {
      joins = `
        JOIN professor_subjects ps ON ps.professorId = p.id
        JOIN evaluations        ev ON ev.professorId = p.id`;
      conditions.push('ps.subjectId = ?');
      params.push(subjectId);
      conditions.push('ev.semestre = ?');
      params.push(semestre);
    } else if (subjectId) {
      joins = ' JOIN professor_subjects ps ON ps.professorId = p.id';
      conditions.push('ps.subjectId = ?');
      params.push(subjectId);
    } else if (semestre) {
      joins = ' JOIN evaluations ev ON ev.professorId = p.id';
      conditions.push('ev.semestre = ?');
      params.push(semestre);
    }

    if (search.trim()) {
      conditions.push('LOWER(p.nombre) LIKE ?');
      params.push(`%${search.toLowerCase().trim()}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT DISTINCT p.id, p.nombre, p.departamento, p.avgRating, p.totalEvaluations, p.createdAt
         FROM professors p
         ${joins}
         ${where}
         ORDER BY p.nombre ASC`,
        params,
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  }

  /**
   * Retorna un profesor por ID incluyendo sus materias.
   * Find a professor by ID including their subjects.
   *
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id, nombre, departamento, avgRating, totalEvaluations, createdAt FROM professors WHERE id = ?',
        [id],
        (err, professor) => {
          if (err) return reject(err);
          if (!professor) return resolve(null);

          db.all(
            `SELECT s.id, s.nombre, s.carrera
             FROM subjects s
             JOIN professor_subjects ps ON ps.subjectId = s.id
             WHERE ps.professorId = ?
             ORDER BY s.nombre ASC`,
            [id],
            (err2, subjects) => {
              if (err2) return reject(err2);
              resolve({ ...professor, subjects });
            }
          );
        }
      );
    });
  }

  /**
   * Crea un nuevo profesor.
   * Create a new professor row.
   *
   * @param {{ nombre: string, departamento: string }}
   * @returns {Promise<Object>}
   */
  static async create({ nombre, departamento }) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO professors (nombre, departamento) VALUES (?, ?)',
        [nombre.trim(), (departamento || '').trim()],
        function (err) {
          if (err) return reject(err);
          db.get('SELECT * FROM professors WHERE id = ?', [this.lastID], (err2, row) => {
            if (err2) return reject(err2);
            resolve(row);
          });
        }
      );
    });
  }

  /**
   * Asocia materias a un profesor (INSERT OR IGNORE para idempotencia).
   * Link subjects to a professor (idempotent).
   *
   * @param {number} professorId
   * @param {number[]} subjectIds
   * @returns {Promise<void>}
   */
  static async linkSubjects(professorId, subjectIds) {
    const db = getDb();
    if (!subjectIds.length) return Promise.resolve();
    const placeholders = subjectIds.map(() => '(?, ?)').join(', ');
    const params = subjectIds.flatMap((sid) => [professorId, sid]);
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO professor_subjects (professorId, subjectId) VALUES ${placeholders}`,
        params,
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  /**
   * Verifica si un profesor imparte una materia específica.
   * Check whether a professor teaches a specific subject.
   *
   * @param {number} professorId
   * @param {number} subjectId
   * @returns {Promise<boolean>}
   */
  static async teachesSubject(professorId, subjectId) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT 1 FROM professor_subjects WHERE professorId = ? AND subjectId = ?',
        [professorId, subjectId],
        (err, row) => {
          if (err) return reject(err);
          resolve(!!row);
        }
      );
    });
  }

  /**
   * Recalcula el promedio y total de evaluaciones de un profesor.
   * Recalculate a professor's average rating and evaluation count.
   *
   * @param {number} professorId
   * @returns {Promise<{ avgRating: number, totalEvaluations: number }>}
   */
  static async updateStats(professorId) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT AVG(rating) AS avg, COUNT(*) AS total FROM evaluations WHERE professorId = ?',
        [professorId],
        (err, stats) => {
          if (err) return reject(err);
          const avgRating        = stats.avg   ? parseFloat(stats.avg.toFixed(2))  : 0;
          const totalEvaluations = stats.total ?? 0;
          db.run(
            'UPDATE professors SET avgRating = ?, totalEvaluations = ? WHERE id = ?',
            [avgRating, totalEvaluations, professorId],
            (err2) => {
              if (err2) return reject(err2);
              resolve({ avgRating, totalEvaluations });
            }
          );
        }
      );
    });
  }
}

module.exports = Professor;
