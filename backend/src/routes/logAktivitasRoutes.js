const express = require('express');
const router = express.Router();
const { getLogAktivitas } = require('../controllers/logAktivitasController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// GET /api/log-aktivitas (Admin only)
router.get('/', verifyToken, requireRole('admin'), getLogAktivitas);

module.exports = router;
