const express = require('express');
const router = express.Router();
const { cariDosen, getDetailDosen } = require('../controllers/pencarianDosenController');

// GET /api/pencarian-dosen (Cari & Filter dosen)
router.get('/', cariDosen);

// GET /api/pencarian-dosen/:id (Detail status & jadwal)
router.get('/:id', getDetailDosen);

module.exports = router;
