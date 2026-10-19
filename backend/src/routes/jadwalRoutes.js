const express = require('express');
const multer = require('multer');
const {
  getJadwal, createJadwal, updateJadwal, deleteJadwal, importJadwal, downloadTemplate,
} = require('../controllers/jadwalController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', verifyToken, requireRole('mahasiswa', 'dosen', 'admin'), getJadwal);
router.get('/template', verifyToken, requireRole('admin'), downloadTemplate);
router.post('/', verifyToken, requireRole('admin'), createJadwal);
router.put('/:id', verifyToken, requireRole('admin'), updateJadwal);
router.delete('/:id', verifyToken, requireRole('admin'), deleteJadwal);
router.post('/import', verifyToken, requireRole('admin'), upload.single('file'), importJadwal);

module.exports = router;
