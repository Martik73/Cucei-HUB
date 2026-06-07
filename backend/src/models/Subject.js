const { getDb } = require('../config/mongodb');

class Subject {
  /**
   * Lista todas las materias, con filtro opcional por carrera.
   * List all subjects, optionally filtered by carrera.
   *
   * @param {string|null} carrera
   * @returns {Promise<Array>}
   */
  static async findAll(carrera = null) {
    const db = getDb();
    const where = carrera ? 'WHERE carrera = ?' : '';
    const params = carrera ? [carrera] : [];
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, nombre, carrera FROM subjects ${where} ORDER BY nombre ASC`,
        params,
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  }

  /**
   * Crea una nueva materia.
   * Create a new subject row.
   *
   * @param {{ nombre: string, carrera?: string }}
   * @returns {Promise<Object>}
   */
  static async create({ nombre, carrera = '' }) {
    const db = getDb();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO subjects (nombre, carrera) VALUES (?, ?)',
        [nombre.trim(), carrera],
        function (err) {
          if (err) return reject(err);
          db.get('SELECT * FROM subjects WHERE id = ?', [this.lastID], (err2, row) => {
            if (err2) return reject(err2);
            resolve(row);
          });
        }
      );
    });
  }
}

module.exports = Subject;
