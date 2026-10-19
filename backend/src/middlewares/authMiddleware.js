const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak: Token autentikasi tidak ditemukan.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'lectura_jwt_secret_key_2026_super_secure'
    );
    const [rows] = await pool.query(
      `SELECT id, role, campus_id, managed_jurusan_id, managed_prodi_id
       FROM users WHERE id = ? LIMIT 1`,
      [decoded.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Akun tidak ditemukan atau sudah dinonaktifkan.',
      });
    }
    req.user = {
      ...decoded,
      role: rows[0].role,
      campus_id: rows[0].campus_id,
      managed_jurusan_id: rows[0].managed_jurusan_id,
      managed_prodi_id: rows[0].managed_prodi_id,
    };
    return next();
  } catch (error) {
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
      console.error('verifyToken Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal memverifikasi sesi pengguna.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Sesi kedaluwarsa atau token tidak valid. Silakan login kembali.',
      error: error.message,
    });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const adminRoles = ['superadmin', 'admin_kampus', 'admin_prodi'];
    const roleAllowed = req.user && allowedRoles.some((role) =>
      role === 'admin' ? adminRoles.includes(req.user.role) : role === req.user.role
    );
    if (!roleAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: Anda tidak memiliki izin untuk mengakses resource ini.',
      });
    }
    next();
  };
};

const requireCampusScope = (req, res, next) => {
  if (req.user?.role !== 'superadmin' && !req.user?.campus_id) {
    return res.status(403).json({
      success: false,
      message: 'Akun belum ditetapkan ke kampus.',
    });
  }
  return next();
};

module.exports = {
  verifyToken,
  requireRole,
  requireCampusScope,
};
