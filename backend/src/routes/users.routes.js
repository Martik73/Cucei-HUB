const express     = require('express');
const router      = express.Router();
const { verifyToken } = require('../middleware/auth');
const { searchUsers, getPublicProfile, getUserPosts } = require('../controllers/users.controller');

// GET /api/users?search=<query>
router.get('/', verifyToken, searchUsers);

// GET /api/users/:id
router.get('/:id', verifyToken, getPublicProfile);

// GET /api/users/:id/posts
router.get('/:id/posts', verifyToken, getUserPosts);

module.exports = router;
