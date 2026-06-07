/**
 * Seed: profesores y materias de Ingeniería en Computación.
 * Ejecutar: node scripts/seed-professors.js
 *
 * Idempotente — no inserta duplicados.
 */

require('dotenv').config();
const { connectMongoDB, getDb } = require('../src/config/mongodb');

const CARRERA = 'Ingeniería en Computación';

const SUBJECTS = [
  { nombre: 'Cálculo Diferencial',              carrera: CARRERA },
  { nombre: 'Cálculo Integral',                  carrera: CARRERA },
  { nombre: 'Álgebra Lineal',                    carrera: CARRERA },
  { nombre: 'Estructuras de Datos',              carrera: CARRERA },
  { nombre: 'Bases de Datos',                    carrera: CARRERA },
  { nombre: 'Redes de Computadoras',             carrera: CARRERA },
  { nombre: 'Sistemas Operativos',               carrera: CARRERA },
  { nombre: 'Programación Orientada a Objetos',  carrera: CARRERA },
  { nombre: 'Ingeniería de Software',            carrera: CARRERA },
  { nombre: 'Inteligencia Artificial',           carrera: CARRERA },
  { nombre: 'Compiladores',                      carrera: CARRERA },
  { nombre: 'Seguridad Informática',             carrera: CARRERA },
];

// subjectIndices corresponde a índices dentro de SUBJECTS (base-0)
const PROFESSORS = [
  { nombre: 'Dr. Carlos Mendoza Reyes',   departamento: 'Matemáticas',                subjectIndices: [0, 1, 2] },
  { nombre: 'Dra. Laura Jiménez Vega',    departamento: 'Computación',                subjectIndices: [3, 7, 8] },
  { nombre: 'M.C. Roberto Hernández Gil', departamento: 'Computación',                subjectIndices: [4, 8]    },
  { nombre: 'Dra. Ana García Morales',    departamento: 'Redes y Telecomunicaciones', subjectIndices: [5, 6]    },
  { nombre: 'Dr. Miguel Torres Soto',     departamento: 'Inteligencia Artificial',    subjectIndices: [9, 7]    },
  { nombre: 'M.C. Patricia López Cruz',   departamento: 'Computación',                subjectIndices: [3, 4]    },
  { nombre: 'Dr. Fernando Ruiz Espinoza', departamento: 'Matemáticas',                subjectIndices: [0, 2]    },
  { nombre: 'Dra. Sofía Martínez Reina',  departamento: 'Sistemas',                  subjectIndices: [6, 5, 11]},
  { nombre: 'M.C. Javier Castro Díaz',    departamento: 'Computación',                subjectIndices: [10, 11]  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const run = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });

const get = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  await connectMongoDB();
  const db = getDb();

  console.log('\n📚 Insertando materias…');
  const subjectIds = [];

  for (const s of SUBJECTS) {
    const existing = await get(db, 'SELECT id FROM subjects WHERE nombre = ? AND carrera = ?', [s.nombre, s.carrera]);
    if (existing) {
      subjectIds.push(existing.id);
      console.log(`  ✓ Ya existe: ${s.nombre}`);
    } else {
      const id = await run(db, 'INSERT INTO subjects (nombre, carrera) VALUES (?, ?)', [s.nombre, s.carrera]);
      subjectIds.push(id);
      console.log(`  + Creada: ${s.nombre} (id ${id})`);
    }
  }

  console.log('\n👨‍🏫 Insertando profesores…');

  for (const p of PROFESSORS) {
    let profId;
    const existing = await get(db, 'SELECT id FROM professors WHERE nombre = ?', [p.nombre]);

    if (existing) {
      profId = existing.id;
      console.log(`  ✓ Ya existe: ${p.nombre}`);
    } else {
      profId = await run(db, 'INSERT INTO professors (nombre, departamento) VALUES (?, ?)', [p.nombre, p.departamento]);
      console.log(`  + Creado: ${p.nombre} (id ${profId})`);
    }

    // Link subjects (idempotent)
    for (const idx of p.subjectIndices) {
      const sid = subjectIds[idx];
      if (!sid) continue;
      await run(
        db,
        'INSERT OR IGNORE INTO professor_subjects (professorId, subjectId) VALUES (?, ?)',
        [profId, sid]
      );
    }
  }

  console.log('\n✅ Seed completado.\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
