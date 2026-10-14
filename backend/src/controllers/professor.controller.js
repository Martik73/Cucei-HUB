const { Types } = require('mongoose');
const Professor  = require('../models/Professor');
const Evaluation = require('../models/Evaluation');
const Subject    = require('../models/Subject');

const parseOid = (raw) => Types.ObjectId.isValid(raw) ? raw : null;

// ─── Profesores ───────────────────────────────────────────────────────────────

const listProfessors = async (req, res) => {
  const { search = '', subject, semestre } = req.query;
  try {
    const professors = await Professor.findAll({
      search,
      subjectId: subject  ? subject                  : null,
      semestre:  semestre ? parseInt(semestre, 10)   : null,
    });
    return res.status(200).json({ professors });
  } catch (error) {
    console.error('Error en listProfessors:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const getProfessor = async (req, res) => {
  const id = parseOid(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID de profesor inválido' });
  try {
    const professor = await Professor.findById(id);
    if (!professor) return res.status(404).json({ message: 'Profesor no encontrado' });
    return res.status(200).json({ professor });
  } catch (error) {
    console.error('Error en getProfessor:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const getEvaluations = async (req, res) => {
  const professorId = parseOid(req.params.id);
  if (!professorId) return res.status(400).json({ message: 'ID de profesor inválido' });

  const { subject, semestre, page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, parseInt(page,  10) || 1);
  const limitNum = Math.min(50, parseInt(limit, 10) || 20);
  try {
    const data = await Evaluation.findByProfessor({
      professorId,
      subjectId: subject  ? subject                 : null,
      semestre:  semestre ? parseInt(semestre, 10)  : null,
      page: pageNum, limit: limitNum,
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error en getEvaluations:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const createEvaluation = async (req, res) => {
  const professorId = parseOid(req.params.id);
  if (!professorId) return res.status(400).json({ message: 'ID de profesor inválido' });

  const { subjectId, rating, comment = '', semestre } = req.body;
  const studentId = req.user.uid;

  const ratingNum   = parseInt(rating,   10);
  const semestreNum = parseInt(semestre, 10);

  if (!ratingNum || ratingNum < 1 || ratingNum > 5)
    return res.status(400).json({ message: 'La calificación debe ser entre 1 y 5' });
  if (!Types.ObjectId.isValid(subjectId))
    return res.status(400).json({ message: 'La materia es requerida' });
  if (!semestreNum || semestreNum < 1 || semestreNum > 12)
    return res.status(400).json({ message: 'El semestre debe ser entre 1 y 12' });

  try {
    const professor = await Professor.findById(professorId);
    if (!professor) return res.status(404).json({ message: 'Profesor no encontrado' });

    const teaches = await Professor.teachesSubject(professorId, subjectId);
    if (!teaches) return res.status(400).json({ message: 'El profesor no imparte esa materia' });

    const evaluation = await Evaluation.create({
      professorId, subjectId, studentId,
      rating: ratingNum, comment: comment.trim(), semestre: semestreNum,
    });
    const stats = await Professor.updateStats(professorId);
    return res.status(201).json({ message: 'Evaluación registrada exitosamente', evaluation, professorStats: stats });
  } catch (error) {
    if (error.code === 'DUPLICATE')
      return res.status(409).json({ message: 'Ya evaluaste a este profesor en esta materia' });
    console.error('Error en createEvaluation:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const createProfessor = async (req, res) => {
  const { nombre, departamento = '', subjectIds = [] } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre del profesor es requerido' });
  try {
    const professor = await Professor.create({ nombre, departamento });
    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      await Professor.linkSubjects(professor.id, subjectIds);
    }
    return res.status(201).json({ message: 'Profesor creado', professor });
  } catch (error) {
    console.error('Error en createProfessor:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ─── Materias ─────────────────────────────────────────────────────────────────

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

const createSubject = async (req, res) => {
  const { nombre, carrera = '' } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre de la materia es requerido' });
  try {
    const subject = await Subject.create({ nombre, carrera });
    return res.status(201).json({ message: 'Materia creada', subject });
  } catch (error) {
    console.error('Error en createSubject:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { listProfessors, getProfessor, getEvaluations, createEvaluation, createProfessor, listSubjects, createSubject };
