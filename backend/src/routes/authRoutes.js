const express = require('express');
const router = express.Router();
const { login, getMe, changePassword } = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me (Protected)
router.get('/me', verifyToken, getMe);

// PATCH /api/auth/change-password (Protected)
router.patch('/change-password', verifyToken, changePassword);

module.exports = router;
