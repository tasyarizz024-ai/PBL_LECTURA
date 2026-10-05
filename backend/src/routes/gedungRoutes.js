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

// Public / Authenticated read routes
router.get('/', getGedungList);
router.get('/:id', getGedungById);

// Admin-only mutation routes
router.post('/', verifyToken, requireRole('admin'), createGedung);
router.put('/:id', verifyToken, requireRole('admin'), updateGedung);
router.delete('/:id', verifyToken, requireRole('admin'), deleteGedung);

module.exports = router;
