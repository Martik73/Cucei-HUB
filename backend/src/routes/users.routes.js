const express     = require('express');
const router      = express.Router();
const { verifyToken } = require('../middleware/auth');
const { searchUsers } = require('../controllers/users.controller');

// GET /api/users?search=<query>
router.get('/', verifyToken, searchUsers);

module.exports = router;
