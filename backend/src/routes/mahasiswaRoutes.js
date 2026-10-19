const express = require('express');
const router = express.Router();
const { getMahasiswaList, createMahasiswa } = require('../controllers/mahasiswaController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken, requireRole('admin_kampus', 'admin_prodi'));
router.get('/', getMahasiswaList);
router.post('/', createMahasiswa);

module.exports = router;
