const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

/**
 * Controller untuk Manajemen Pengguna (Admin Dashboard)
 */

/**
 * GET /api/admin/users
 * Mengambil daftar seluruh pengguna (Admin, Dosen, Mahasiswa)
 * Query: role (all|admin|dosen|mahasiswa), search, page, limit
 */
const getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;

    let query = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.created_at,
        u.updated_at,
        COALESCE(m.nama, d.nama, 'Administrator') AS nama,
        COALESCE(m.nim, d.nip, '-') AS nomor_induk,
        m.nim,
        m.prodi AS mahasiswa_prodi,
        d.id AS dosen_id,
        d.nip,
        d.jabatan AS dosen_jabatan,
        d.gps_enabled,
        p.id AS prodi_id,
        p.nama_prodi,
        j.nama_jurusan
      FROM users u
      LEFT JOIN mahasiswa m ON m.user_id = u.id
      LEFT JOIN dosen d      ON d.user_id = u.id
      LEFT JOIN prodi p      ON d.prodi_id = p.id
      LEFT JOIN jurusan j    ON p.jurusan_id = j.id
      WHERE 1=1
    `;
    const params = [];

    if (role && ['admin', 'dosen', 'mahasiswa'].includes(role.toLowerCase())) {
      query += ' AND u.role = ?';
      params.push(role.toLowerCase());
    }

    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      query += ` AND (
        u.email LIKE ? OR 
        m.nama LIKE ? OR 
        m.nim LIKE ? OR 
        d.nama LIKE ? OR 
        d.nip LIKE ? OR
        p.nama_prodi LIKE ?
      )`;
      params.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }

    query += ' ORDER BY u.created_at DESC';

    const [rows] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('getUsers Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar pengguna.',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/users/meta/prodi
 * Ambil daftar prodi untuk pilihan dropdown saat admin menambah dosen/mahasiswa
 */
const getProdiList = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.nama_prodi, j.id AS jurusan_id, j.nama_jurusan
      FROM prodi p
      JOIN jurusan j ON p.jurusan_id = j.id
      ORDER BY j.nama_jurusan ASC, p.nama_prodi ASC
    `);
    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('getProdiList Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data prodi.',
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/users
 * Menambahkan pengguna baru (Mahasiswa, Dosen, atau Admin)
 * Body:
 *   - role: 'admin' | 'dosen' | 'mahasiswa'
 *   - email: string
 *   - password: string
 *   - (jika dosen): nip, nama, prodi_id, jabatan?, foto?
 *   - (jika mahasiswa): nim, nama, prodi?
 */
const createUser = async (req, res) => {
  let conn;
  try {
    const {
      role,
      email,
      password,
      // Dosen fields
      nip,
      prodi_id,
      jabatan,
      foto,
      // Mahasiswa fields
      nim,
      // Shared fields
      nama,
      prodi,
    } = req.body;

    const userRole = (role || '').trim().toLowerCase();
    const userEmail = (email || '').trim().toLowerCase();
    const userPass = password || '';

    // Validasi dasar
    if (!['admin', 'dosen', 'mahasiswa'].includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: "Role harus berupa 'admin', 'dosen', atau 'mahasiswa'.",
      });
    }

    if (!userEmail || !userEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Format email tidak valid.',
      });
    }

    if (!userPass || userPass.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password wajib diisi minimal 6 karakter.',
      });
    }

    // Cek duplikasi email
    const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [userEmail]);
    if (existingEmail.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Email '${userEmail}' sudah terdaftar dalam sistem.`,
      });
    }

    // Validasi field spesifik role
    if (userRole === 'dosen') {
      if (!nip || !nip.trim()) {
        return res.status(400).json({ success: false, message: 'NIP wajib diisi untuk dosen.' });
      }
      if (!nama || !nama.trim()) {
        return res.status(400).json({ success: false, message: 'Nama lengkap wajib diisi untuk dosen.' });
      }
      if (!prodi_id) {
        return res.status(400).json({ success: false, message: 'Program Studi wajib dipilih untuk dosen.' });
      }

      const [existingNip] = await pool.query('SELECT id FROM dosen WHERE nip = ? LIMIT 1', [nip.trim()]);
      if (existingNip.length > 0) {
        return res.status(400).json({
          success: false,
          message: `NIP '${nip.trim()}' sudah terdaftar untuk dosen lain.`,
        });
      }
    } else if (userRole === 'mahasiswa') {
      if (!nim || !nim.trim()) {
        return res.status(400).json({ success: false, message: 'NIM wajib diisi untuk mahasiswa.' });
      }
      if (!nama || !nama.trim()) {
        return res.status(400).json({ success: false, message: 'Nama lengkap wajib diisi untuk mahasiswa.' });
      }

      const [existingNim] = await pool.query('SELECT id FROM mahasiswa WHERE nim = ? LIMIT 1', [nim.trim()]);
      if (existingNim.length > 0) {
        return res.status(400).json({
          success: false,
          message: `NIM '${nim.trim()}' sudah terdaftar untuk mahasiswa lain.`,
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userPass, 10);

    // Buka koneksi database dengan transaksi
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1. Insert ke tabel users
    const [userResult] = await conn.query(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [userEmail, hashedPassword, userRole]
    );
    const newUserId = userResult.insertId;

    // 2. Insert ke tabel profil sesuai role
    let profileId = null;
    if (userRole === 'dosen') {
      const [dosenResult] = await conn.query(
        `INSERT INTO dosen (user_id, prodi_id, nip, nama, jabatan, foto, gps_enabled)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [
          newUserId,
          Number(prodi_id),
          nip.trim(),
          nama.trim(),
          jabatan ? jabatan.trim() : 'Dosen Pengajar',
          foto ? foto.trim() : null,
        ]
      );
      profileId = dosenResult.insertId;

      // Inisialisasi current_status
      await conn.query(
        `INSERT INTO current_status (dosen_id, status_type, last_updated)
         VALUES (?, 'tidak_diketahui', NOW())
         ON DUPLICATE KEY UPDATE status_type = 'tidak_diketahui', last_updated = NOW()`,
        [profileId]
      );
    } else if (userRole === 'mahasiswa') {
      const [mhsResult] = await conn.query(
        `INSERT INTO mahasiswa (user_id, nim, nama, prodi)
         VALUES (?, ?, ?, ?)`,
        [
          newUserId,
          nim.trim(),
          nama.trim(),
          prodi ? prodi.trim() : null,
        ]
      );
      profileId = mhsResult.insertId;
    }

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: `Pengguna baru dengan role '${userRole}' berhasil dibuat.`,
      data: {
        id: newUserId,
        email: userEmail,
        role: userRole,
        profile_id: profileId,
        nama: nama ? nama.trim() : (userRole === 'admin' ? 'Administrator' : null),
        nomor_induk: nip ? nip.trim() : (nim ? nim.trim() : null),
      },
    });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('createUser Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan pengguna baru.',
      error: error.message,
    });
  } finally {
    if (conn) conn.release();
  }
};

/**
 * DELETE /api/admin/users/:id
 * Menghapus pengguna (beserta profil terkait lewat cascade)
 */
const deleteUser = async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'ID pengguna tidak valid.',
      });
    }

    // Cegah admin menghapus dirinya sendiri
    if (targetUserId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat menghapus akun Anda sendiri.',
      });
    }

    const [rows] = await pool.query('SELECT id, email, role FROM users WHERE id = ? LIMIT 1', [targetUserId]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.',
      });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [targetUserId]);

    return res.status(200).json({
      success: true,
      message: `Pengguna '${rows[0].email}' (${rows[0].role}) berhasil dihapus.`,
    });
  } catch (error) {
    console.error('deleteUser Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus pengguna.',
      error: error.message,
    });
  }
};

module.exports = {
  getUsers,
  getProdiList,
  createUser,
  deleteUser,
};
