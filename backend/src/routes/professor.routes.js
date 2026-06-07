const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const {
  listProfessors,
  getProfessor,
  getEvaluations,
  createEvaluation,
  createProfessor,
} = require('../controllers/professor.controller');

const router = Router();

// GET  /api/professors          — lista con filtros
router.get('/',    verifyToken, listProfessors);

// GET  /api/professors/:id      — detalle + materias
router.get('/:id', verifyToken, getProfessor);

// GET  /api/professors/:id/evaluations — evaluaciones con filtros
router.get('/:id/evaluations', verifyToken, getEvaluations);

// POST /api/professors/:id/evaluations — registrar evaluación
router.post('/:id/evaluations', verifyToken, createEvaluation);

// POST /api/professors          — crear profesor (seed/admin)
router.post('/', verifyToken, createProfessor);

module.exports = router;
