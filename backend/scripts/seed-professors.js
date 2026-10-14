/**
 * Seed: profesores y materias de Ingeniería en Computación.
 * Ejecutar: node scripts/seed-professors.js
 *
 * Idempotente — no inserta duplicados.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectMongoDB } = require('../src/config/mongodb');

// Registrar modelos en el orden correcto
require('../src/models/User');
require('../src/models/Subject');
require('../src/models/Evaluation');
const Professor = require('../src/models/Professor');
const Subject   = require('../src/models/Subject');

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

async function seed() {
  await connectMongoDB();

  console.log('\n📚 Insertando materias…');
  const subjectIds = [];

  for (const s of SUBJECTS) {
    let doc = await mongoose.model('Subject').findOne({ nombre: s.nombre, carrera: s.carrera }).lean();
    if (doc) {
      subjectIds.push(doc._id);
      console.log(`  ✓ Ya existe: ${s.nombre}`);
    } else {
      doc = await Subject.create({ nombre: s.nombre, carrera: s.carrera });
      subjectIds.push(doc.id);
      console.log(`  + Creada: ${s.nombre} (id ${doc.id})`);
    }
  }

  console.log('\n👨‍🏫 Insertando profesores…');

  for (const p of PROFESSORS) {
    let doc = await mongoose.model('Professor').findOne({ nombre: p.nombre }).lean();
    if (doc) {
      console.log(`  ✓ Ya existe: ${p.nombre}`);
      const ids = p.subjectIndices.map((i) => subjectIds[i]).filter(Boolean);
      await Professor.linkSubjects(doc._id.toString(), ids.map(String));
    } else {
      const created = await Professor.create({ nombre: p.nombre, departamento: p.departamento });
      console.log(`  + Creado: ${p.nombre} (id ${created.id})`);
      const ids = p.subjectIndices.map((i) => subjectIds[i]).filter(Boolean);
      await Professor.linkSubjects(created.id, ids.map(String));
    }
  }

  console.log('\n✅ Seed completado.\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
