const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const { listSubjects, createSubject } = require('../controllers/professor.controller');

const router = Router();

// GET  /api/subjects          — lista (para filtros y selectores)
router.get('/',  verifyToken, listSubjects);

// POST /api/subjects          — crear materia (seed/admin)
router.post('/', verifyToken, createSubject);

module.exports = router;
