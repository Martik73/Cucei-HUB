const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const { getMaterialFile, deleteMaterial } = require('../controllers/community.controller');

const router = Router();
router.use(verifyToken);
router.get('/:id/file', getMaterialFile);
router.delete('/:id', deleteMaterial);

module.exports = router;
