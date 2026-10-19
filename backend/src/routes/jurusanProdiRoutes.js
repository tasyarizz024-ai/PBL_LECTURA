const express = require('express');
const router = express.Router();
const {
  getJurusanList,
  getJurusanById,
  createJurusan,
  updateJurusan,
  deleteJurusan,
  getProdiList,
  getProdiById,
  createProdi,
  updateProdi,
  deleteProdi,
} = require('../controllers/jurusanProdiController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/jurusan', verifyToken, requireRole('mahasiswa', 'dosen', 'admin'), getJurusanList);
router.get('/jurusan/:id', verifyToken, requireRole('mahasiswa', 'dosen', 'admin'), getJurusanById);
router.get('/prodi', verifyToken, requireRole('mahasiswa', 'dosen', 'admin'), getProdiList);
router.get('/prodi/:id', verifyToken, requireRole('mahasiswa', 'dosen', 'admin'), getProdiById);

// Admin-only mutation routes
router.post('/jurusan', verifyToken, requireRole('admin_kampus'), createJurusan);
router.put('/jurusan/:id', verifyToken, requireRole('admin_kampus'), updateJurusan);
router.delete('/jurusan/:id', verifyToken, requireRole('admin_kampus'), deleteJurusan);

router.post('/prodi', verifyToken, requireRole('admin_kampus'), createProdi);
router.put('/prodi/:id', verifyToken, requireRole('admin_kampus'), updateProdi);
router.delete('/prodi/:id', verifyToken, requireRole('admin_kampus'), deleteProdi);

module.exports = router;
