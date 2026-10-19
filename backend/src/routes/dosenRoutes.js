const express = require('express');
const router = express.Router();
const {
  getDosenList,
  getDosenById,
  createDosen,
  updateDosen,
  deleteDosen,
  getProdiList,
} = require('../controllers/dosenController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

const { getDetailDosen } = require('../controllers/pencarianDosenController');

// Tenant-scoped reads require an authenticated campus user.
router.get('/', verifyToken, requireRole('mahasiswa', 'dosen', 'admin'), getDosenList);
router.get('/meta/prodi', verifyToken, requireRole('mahasiswa', 'dosen', 'admin'), getProdiList);
router.get('/:id', verifyToken, requireRole('mahasiswa', 'dosen', 'admin'), getDosenById);
router.get('/:id/status-detail', verifyToken, requireRole('mahasiswa', 'dosen', 'admin'), getDetailDosen);

// Admin-only mutation routes
router.post('/', verifyToken, requireRole('admin'), createDosen);
router.put('/:id', verifyToken, requireRole('admin'), updateDosen);
router.delete('/:id', verifyToken, requireRole('admin'), deleteDosen);

module.exports = router;
