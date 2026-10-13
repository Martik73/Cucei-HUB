const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  listCommunities,
  createCommunity,
  getCommunity,
  joinCommunity,
  leaveCommunity,
  getMaterials,
  uploadMaterial,
  getMessages,
  sendMessage,
} = require('../controllers/community.controller');

const router = Router();

// Comunidades
router.get('/',    verifyToken, listCommunities);
router.post('/',   verifyToken, createCommunity);
router.get('/:id', verifyToken, getCommunity);
router.post('/:id/join',  verifyToken, joinCommunity);
router.post('/:id/leave', verifyToken, leaveCommunity);

// Materiales de una comunidad
router.get('/:id/materials',  verifyToken, getMaterials);
router.post('/:id/materials', verifyToken, upload.single('file'), uploadMaterial);

// Canal de discusión persistente
router.get('/:id/messages',  verifyToken, getMessages);
router.post('/:id/messages', verifyToken, sendMessage);

module.exports = router;
