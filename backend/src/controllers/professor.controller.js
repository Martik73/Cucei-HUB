const Professor  = require('../models/Professor');
const Evaluation = require('../models/Evaluation');
const Subject    = require('../models/Subject');

// ─── Profesores ───────────────────────────────────────────────────────────────

/**
 * GET /api/professors?search=&subject=&semestre=
 * Lista profesores con filtros opcionales.
 *
 * @type {import('express').RequestHandler}
 */
const listProfessors = async (req, res) => {
  const { search = '', subject, semestre } = req.query;
  try {
    const professors = await Professor.findAll({
      search,
      subjectId: subject  ? parseInt(subject,  10) : null,
      semestre:  semestre ? parseInt(semestre, 10) : null,
    });
    return res.status(200).json({ professors });
  } catch (error) {
    console.error('Error en listProfessors:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/professors/:id
 * Detalle de un profesor + sus materias.
 *
 * @type {import('express').RequestHandler}
 */
const getProfessor = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    return res.status(400).json({ message: 'ID de profesor inválido' });
  }
  try {
    const professor = await Professor.findById(id);
    if (!professor) return res.status(404).json({ message: 'Profesor no encontrado' });
    return res.status(200).json({ professor });
  } catch (error) {
    console.error('Error en getProfessor:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/professors/:id/evaluations?subject=&semestre=&page=&limit=
 * Evaluaciones de un profesor con nombre del alumno (sin anonimato).
 *
 * @type {import('express').RequestHandler}
 */
const getEvaluations = async (req, res) => {
  const professorId = parseInt(req.params.id, 10);
  if (!Number.isFinite(professorId) || professorId < 1) {
    return res.status(400).json({ message: 'ID de profesor inválido' });
  }
  const { subject, semestre, page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
  const limitNum = Math.min(50, parseInt(limit, 10) || 20);

  try {
    const data = await Evaluation.findByProfessor({
      professorId,
      subjectId: subject  ? parseInt(subject,  10) : null,
      semestre:  semestre ? parseInt(semestre, 10) : null,
      page:      pageNum,
      limit:     limitNum,
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error en getEvaluations:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * POST /api/professors/:id/evaluations
 * Registrar evaluación. Un alumno solo puede evaluar una vez por materia.
 * El promedio del profesor se recalcula automáticamente.
 *
 * Body: { subjectId, rating (1-5), comment?, semestre }
 *
 * @type {import('express').RequestHandler}
 */
const createEvaluation = async (req, res) => {
  const professorId = parseInt(req.params.id, 10);
  if (!Number.isFinite(professorId) || professorId < 1) {
    return res.status(400).json({ message: 'ID de profesor inválido' });
  }

  const { subjectId, rating, comment = '', semestre } = req.body;
  const studentId = req.user.uid;

  const ratingNum   = parseInt(rating,   10);
  const subjectIdN  = parseInt(subjectId, 10);
  const semestreNum = parseInt(semestre, 10);

  if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ message: 'La calificación debe ser entre 1 y 5' });
  }
  if (!subjectIdN || !Number.isFinite(subjectIdN)) {
    return res.status(400).json({ message: 'La materia es requerida' });
  }
  if (!semestreNum || semestreNum < 1 || semestreNum > 12) {
    return res.status(400).json({ message: 'El semestre debe ser entre 1 y 12' });
  }

  try {
    const professor = await Professor.findById(professorId);
    if (!professor) return res.status(404).json({ message: 'Profesor no encontrado' });

    const teaches = await Professor.teachesSubject(professorId, subjectIdN);
    if (!teaches) {
      return res.status(400).json({ message: 'El profesor no imparte esa materia' });
    }

    const evaluation = await Evaluation.create({
      professorId,
      subjectId:  subjectIdN,
      studentId,
      rating:     ratingNum,
      comment:    comment.trim(),
      semestre:   semestreNum,
    });

    const stats = await Professor.updateStats(professorId);

    return res.status(201).json({
      message: 'Evaluación registrada exitosamente',
      evaluation,
      professorStats: stats,
    });
  } catch (error) {
    if (error.code === 'DUPLICATE') {
      return res.status(409).json({ message: 'Ya evaluaste a este profesor en esta materia' });
    }
    console.error('Error en createEvaluation:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * POST /api/professors
 * Crear profesor (para seed/admin).
 *
 * Body: { nombre, departamento, subjectIds?: number[] }
 *
 * @type {import('express').RequestHandler}
 */
const createProfessor = async (req, res) => {
  const { nombre, departamento = '', subjectIds = [] } = req.body;
  if (!nombre?.trim()) {
    return res.status(400).json({ message: 'El nombre del profesor es requerido' });
  }
  try {
    const professor = await Professor.create({ nombre, departamento });
    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      await Professor.linkSubjects(professor.id, subjectIds.map(Number));
    }
    return res.status(201).json({ message: 'Profesor creado', professor });
  } catch (error) {
    console.error('Error en createProfessor:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─── Materias ─────────────────────────────────────────────────────────────────

/**
 * GET /api/subjects?carrera=
 * Lista materias, con filtro opcional por carrera.
 *
 * @type {import('express').RequestHandler}
 */
const listSubjects = async (req, res) => {
  const { carrera } = req.query;
  try {
    const subjects = await Subject.findAll(carrera || null);
    return res.status(200).json({ subjects });
  } catch (error) {
    console.error('Error en listSubjects:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * POST /api/subjects
 * Crear materia (para seed/admin).
 *
 * Body: { nombre, carrera? }
 *
 * @type {import('express').RequestHandler}
 */
const createSubject = async (req, res) => {
  const { nombre, carrera = '' } = req.body;
  if (!nombre?.trim()) {
    return res.status(400).json({ message: 'El nombre de la materia es requerido' });
  }
  try {
    const subject = await Subject.create({ nombre, carrera });
    return res.status(201).json({ message: 'Materia creada', subject });
  } catch (error) {
    console.error('Error en createSubject:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  listProfessors,
  getProfessor,
  getEvaluations,
  createEvaluation,
  createProfessor,
  listSubjects,
  createSubject,
};
