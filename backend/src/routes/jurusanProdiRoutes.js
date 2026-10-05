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

// Public / Authenticated read routes
router.get('/jurusan', getJurusanList);
router.get('/jurusan/:id', getJurusanById);
router.get('/prodi', getProdiList);
router.get('/prodi/:id', getProdiById);

// Admin-only mutation routes
router.post('/jurusan', verifyToken, requireRole('admin'), createJurusan);
router.put('/jurusan/:id', verifyToken, requireRole('admin'), updateJurusan);
router.delete('/jurusan/:id', verifyToken, requireRole('admin'), deleteJurusan);

router.post('/prodi', verifyToken, requireRole('admin'), createProdi);
router.put('/prodi/:id', verifyToken, requireRole('admin'), updateProdi);
router.delete('/prodi/:id', verifyToken, requireRole('admin'), deleteProdi);

module.exports = router;
