const express = require('express');
const router = express.Router();
const {
  cariDosen,
  getDetailDosen,
  getRealtimeLocation,
} = require('../controllers/pencarianDosenController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, requireRole('mahasiswa', 'dosen', 'admin'), cariDosen);

// Koordinat presisi hanya tersedia untuk mahasiswa yang sudah login.
router.get('/:id/lokasi-realtime', verifyToken, requireRole('mahasiswa'), getRealtimeLocation);

// GET /api/pencarian-dosen/:id (Detail status & jadwal)
router.get('/:id', verifyToken, requireRole('mahasiswa', 'dosen', 'admin'), getDetailDosen);

module.exports = router;
