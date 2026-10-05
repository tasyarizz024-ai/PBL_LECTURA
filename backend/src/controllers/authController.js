const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

/**
 * Login Handler (Mahasiswa & Admin)
 * POST /api/auth/login
 * Body: { email (or identifier / nim), password, role (optional) }
 */
const login = async (req, res) => {
  try {
    const { email, identifier, nim, password, role } = req.body;
    const loginIdentifier = (email || identifier || nim || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/NIM dan password wajib diisi.',
      });
    }

    let query = '';
    let queryParams = [];

    // Jika identifier mengandung '@', cari by users.email
    if (loginIdentifier.includes('@')) {
      query = `
        SELECT 
          u.id, 
          u.email, 
          u.password, 
          u.role,
          m.id AS mahasiswa_id, 
          m.nim, 
          m.nama AS mahasiswa_nama, 
          m.prodi AS mahasiswa_prodi
        FROM users u
        LEFT JOIN mahasiswa m ON m.user_id = u.id
        WHERE u.email = ?
        LIMIT 1
      `;
      queryParams = [loginIdentifier];
    } else {
      // Jika tidak ada '@', diasumsikan login menggunakan NIM (khusus mahasiswa)
      query = `
        SELECT 
          u.id, 
          u.email, 
          u.password, 
          u.role,
          m.id AS mahasiswa_id, 
          m.nim, 
          m.nama AS mahasiswa_nama, 
          m.prodi AS mahasiswa_prodi
        FROM users u
        INNER JOIN mahasiswa m ON m.user_id = u.id
        WHERE m.nim = ?
        LIMIT 1
      `;
      queryParams = [loginIdentifier];
    }

    const [rows] = await pool.query(query, queryParams);

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Akun tidak ditemukan. Periksa kembali email atau NIM Anda.',
      });
    }

    const user = rows[0];

    // Validasi kesesuaian role jika tab role dipilih ('mahasiswa' atau 'admin')
    if (role && user.role !== role.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak: Akun ini terdaftar sebagai role '${user.role}', bukan '${role}'.`,
      });
    }

    // Verifikasi hash password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Password yang Anda masukkan salah.',
      });
    }

    // Buat JWT Token
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      mahasiswa_id: user.mahasiswa_id || null,
      nim: user.nim || null,
      nama: user.mahasiswa_nama || (user.role === 'admin' ? 'Administrator' : null),
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'lectura_jwt_secret_key_2026_super_secure',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    // Kirim response
    return res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        nama: user.mahasiswa_nama || (user.role === 'admin' ? 'Administrator' : null),
        nim: user.nim || null,
        prodi: user.mahasiswa_prodi || null,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat memproses login.',
      error: error.message,
    });
  }
};

/**
 * Get Profile of Logged In User
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `
      SELECT 
        u.id, 
        u.email, 
        u.role, 
        u.created_at,
        m.id AS mahasiswa_id, 
        m.nim, 
        m.nama AS mahasiswa_nama, 
        m.prodi AS mahasiswa_prodi
      FROM users u
      LEFT JOIN mahasiswa m ON m.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.',
      });
    }

    const user = rows[0];

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        nama: user.mahasiswa_nama || (user.role === 'admin' ? 'Administrator' : null),
        nim: user.nim || null,
        prodi: user.mahasiswa_prodi || null,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat mengambil profil pengguna.',
      error: error.message,
    });
  }
};

module.exports = {
  login,
  getMe,
};
