const express = require('express');
const router = express.Router();
const {
  getProfil,
  kirimLokasi,
  kirimLokasiBatch,
  updateGps,
  getJadwal,
  createJadwalMandiri,
  updateJadwalMandiri,
  deleteJadwalMandiri,
  getRiwayat,
  updateAvailability,
} = require('../controllers/appDosenController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

/**
 * API khusus Portal / Dashboard Dosen (Web Geolocation + Manajemen Jadwal Mandiri)
 * Semua endpoint dilindungi JWT + role 'dosen'.
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

// Jadwal mengajar mandiri (CRUD)
router.get('/jadwal', verifyToken, requireRole('dosen'), getJadwal);
router.post('/jadwal', verifyToken, requireRole('dosen'), createJadwalMandiri);
router.put('/jadwal/:id', verifyToken, requireRole('dosen'), updateJadwalMandiri);
router.delete('/jadwal/:id', verifyToken, requireRole('dosen'), deleteJadwalMandiri);
router.patch('/ketersediaan', verifyToken, requireRole('dosen'), updateAvailability);

module.exports = router;