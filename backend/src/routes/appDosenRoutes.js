const express = require('express');
const router = express.Router();
const {
  getProfil,
  kirimLokasi,
  kirimLokasiBatch,
  updateGps,
  getJadwal,
  getRiwayat,
} = require('../controllers/appDosenController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

/**
 * API khusus Aplikasi Dosen (Android).
 * Semua endpoint dilindungi JWT + role 'dosen'.
 * Login tetap memakai POST /api/auth/login (role: 'dosen').
 */

// Profil dosen milik user yang login
router.get('/me', verifyToken, requireRole('dosen'), getProfil);

// Kirim titik lokasi (satu per permintaan)
router.post('/lokasi', verifyToken, requireRole('dosen'), kirimLokasi);
// Kirim antrean log offline sekaligus
router.post('/lokasi/batch', verifyToken, requireRole('dosen'), kirimLokasiBatch);

// Riwayat log lokasi milik dosen sendiri
router.get('/lokasi/riwayat', verifyToken, requireRole('dosen'), getRiwayat);

// Toggle pelacakan GPS
router.patch('/gps', verifyToken, requireRole('dosen'), updateGps);

// Jadwal mengajar sendiri
router.get('/jadwal', verifyToken, requireRole('dosen'), getJadwal);

module.exports = router;