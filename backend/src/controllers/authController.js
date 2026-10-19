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
          u.campus_id,
          u.display_name,
          u.managed_jurusan_id,
          u.managed_prodi_id,
          m.id AS mahasiswa_id, 
          m.nim, 
          m.nama AS mahasiswa_nama, 
          m.prodi AS mahasiswa_prodi,
          d.id AS dosen_id,
          d.nip AS dosen_nip,
          d.nama AS dosen_nama
        FROM users u
        LEFT JOIN mahasiswa m ON m.user_id = u.id
        LEFT JOIN dosen d      ON d.user_id = u.id
        WHERE u.email = ?
        LIMIT 1
      `;
      queryParams = [loginIdentifier];
    } else {
      // Jika tidak ada '@', diasumsikan login memakai NIM (mahasiswa) atau NIP (dosen)
      query = `
        SELECT 
          u.id, 
          u.email, 
          u.password, 
          u.role,
          u.campus_id,
          u.display_name,
          u.managed_jurusan_id,
          u.managed_prodi_id,
          m.id AS mahasiswa_id, 
          m.nim, 
          m.nama AS mahasiswa_nama, 
          m.prodi AS mahasiswa_prodi,
          d.id AS dosen_id,
          d.nip AS dosen_nip,
          d.nama AS dosen_nama
        FROM users u
        LEFT JOIN mahasiswa m ON m.user_id = u.id
        LEFT JOIN dosen d      ON d.user_id = u.id
        WHERE m.nim = ? OR d.nip = ?
        LIMIT 1
      `;
      queryParams = [loginIdentifier, loginIdentifier];
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
    const requestedRole = String(role || '').toLowerCase();
    const adminRoles = ['superadmin', 'admin_kampus', 'admin_prodi'];
    const roleMatches = requestedRole === 'admin'
      ? adminRoles.includes(user.role)
      : !requestedRole || user.role === requestedRole;
    if (!roleMatches) {
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

    // Nama & identitas unik sesuai role (mahasiswa: NIM, dosen: NIP)
    const displayName =
      user.mahasiswa_nama ||
      user.dosen_nama ||
      user.display_name ||
      (user.role.startsWith('admin') || user.role === 'superadmin' ? 'Administrator' : null);
    const displayId = user.nim || user.dosen_nip || null;

    // Buat JWT Token
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      campus_id: user.campus_id || null,
      display_name: user.display_name || null,
      managed_jurusan_id: user.managed_jurusan_id || null,
      managed_prodi_id: user.managed_prodi_id || null,
      mahasiswa_id: user.mahasiswa_id || null,
      dosen_id: user.dosen_id || null,
      nim: displayId,
      nama: displayName,
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
        campus_id: user.campus_id || null,
        nama: displayName,
        nim: displayId,
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
        u.campus_id,
        u.display_name,
        u.created_at,
        m.id AS mahasiswa_id, 
        m.nim, 
        m.nama AS mahasiswa_nama, 
        m.prodi AS mahasiswa_prodi,
        d.id AS dosen_id,
        d.nip AS dosen_nip,
        d.nama AS dosen_nama,
        d.gps_enabled
      FROM users u
      LEFT JOIN mahasiswa m ON m.user_id = u.id
      LEFT JOIN dosen d      ON d.user_id = u.id
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
        campus_id: user.campus_id,
        nama:
          user.mahasiswa_nama ||
          user.dosen_nama ||
          user.display_name ||
          (user.role.startsWith('admin') || user.role === 'superadmin' ? 'Administrator' : null),
        nim: user.nim || user.dosen_nip || null,
        prodi: user.mahasiswa_prodi || null,
        gps_enabled:
          user.gps_enabled === null || user.gps_enabled === undefined
            ? null
            : Boolean(user.gps_enabled),
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

/**
 * Change the authenticated user's password.
 * PATCH /api/auth/change-password
 * Body accepts { current_password, new_password } and the legacy
 * { oldPassword, newPassword } shape.
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentPassword = req.body.current_password ?? req.body.oldPassword;
    const newPassword = req.body.new_password ?? req.body.newPassword;

    if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password saat ini dan password baru wajib diisi.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password baru harus terdiri dari minimal 8 karakter.',
      });
    }

    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({
        success: false,
        message: 'Password baru tidak boleh melebihi 72 byte.',
      });
    }

    const [rows] = await pool.query(
      'SELECT password FROM users WHERE id = ? AND role = ? LIMIT 1',
      [userId, req.user.role]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Akun tidak ditemukan.',
      });
    }

    if (!await bcrypt.compare(currentPassword, rows[0].password)) {
      return res.status(400).json({
        success: false,
        message: 'Password saat ini tidak sesuai.',
      });
    }

    if (await bcrypt.compare(newPassword, rows[0].password)) {
      return res.status(400).json({
        success: false,
        message: 'Password baru harus berbeda dari password saat ini.',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ? AND role = ?',
      [hashedPassword, userId, req.user.role]
    );

    return res.status(200).json({
      success: true,
      message: 'Password berhasil diubah.',
    });
  } catch (error) {
    console.error('changePassword Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengubah password.',
      error: error.message,
    });
  }
};

module.exports = {
  login,
  getMe,
  changePassword,
};
