const express = require('express');
const {
  createCampus,
  createCampusAdmin,
  listCampuses,
  listManagedAdmins,
  createProdiAdmin,
} = require('../controllers/tenantController');
const { verifyToken, requireRole, requireCampusScope } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(verifyToken);

router.get('/campuses', requireRole('superadmin'), listCampuses);
router.post('/campuses', requireRole('superadmin'), createCampus);
router.post('/admins/campus', requireRole('superadmin'), createCampusAdmin);
router.get('/admins', requireRole('superadmin', 'admin_kampus'), listManagedAdmins);
router.post('/admins/prodi', requireRole('admin_kampus'), requireCampusScope, createProdiAdmin);

module.exports = router;
