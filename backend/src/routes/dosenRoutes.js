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

// Public / Authenticated read routes
router.get('/', getDosenList);
router.get('/meta/prodi', getProdiList);
router.get('/:id', getDosenById);
router.get('/:id/status-detail', getDetailDosen);

// Admin-only mutation routes
router.post('/', verifyToken, requireRole('admin'), createDosen);
router.put('/:id', verifyToken, requireRole('admin'), updateDosen);
router.delete('/:id', verifyToken, requireRole('admin'), deleteDosen);

module.exports = router;
