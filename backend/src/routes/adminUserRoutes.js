const express = require('express');
const router = express.Router();
const {
  getUsers,
  getProdiList,
  createUser,
  deleteUser,
} = require('../controllers/adminUserController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Semua rute admin user dilindungi token + role admin
router.use(verifyToken, requireRole('admin'));

router.get('/', getUsers);
router.get('/meta/prodi', getProdiList);
router.post('/', createUser);
router.delete('/:id', deleteUser);

module.exports = router;
