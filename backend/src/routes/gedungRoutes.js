const express = require('express');
const router = express.Router();
const {
  getGedungList,
  getGedungById,
  createGedung,
  updateGedung,
  deleteGedung,
} = require('../controllers/gedungController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, requireRole('mahasiswa', 'dosen', 'admin'), getGedungList);
router.get('/:id', verifyToken, requireRole('mahasiswa', 'dosen', 'admin'), getGedungById);

// Admin-only mutation routes
router.post('/', verifyToken, requireRole('admin_kampus'), createGedung);
router.put('/:id', verifyToken, requireRole('admin_kampus'), updateGedung);
router.delete('/:id', verifyToken, requireRole('admin_kampus'), deleteGedung);

module.exports = router;
