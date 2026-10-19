const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { getProdiScope } = require('../utils/tenantScope');

const getMahasiswaScope = (user) => {
  if (user?.role === 'superadmin') return { sql: '1=1', params: [] };
  if (user?.role === 'admin_kampus' && user.campus_id) {
    return { sql: 'u.campus_id = ?', params: [user.campus_id] };
  }
  if (user?.role === 'admin_prodi' && user.campus_id && user.managed_prodi_id) {
    return {
      sql: 'm.prodi_id = ? AND u.campus_id = ?',
      params: [user.managed_prodi_id, user.campus_id],
    };
  }
  if (user?.role === 'admin_prodi' && user.campus_id && user.managed_jurusan_id) {
    return {
      sql: `m.prodi_id IN (SELECT p.id FROM prodi p JOIN jurusan j ON j.id = p.jurusan_id
        WHERE j.id = ? AND j.campus_id = ?)`,
      params: [user.managed_jurusan_id, user.campus_id],
    };
  }
  return { sql: '1=0', params: [] };
};

const getMahasiswaList = async (req, res) => {
  try {
    const scope = getMahasiswaScope(req.user);
    const [rows] = await pool.query(`
      SELECT m.id, m.nim, m.nama, COALESCE(p.nama_prodi, m.prodi) AS prodi, u.email, u.created_at
      FROM mahasiswa m
      JOIN users u ON u.id = m.user_id
      LEFT JOIN prodi p ON p.id = m.prodi_id
      WHERE ${scope.sql}
      ORDER BY m.nama ASC
    `, scope.params);

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('getMahasiswaList Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data mahasiswa.',
    });
  }
};

const createMahasiswa = async (req, res) => {
  const nama = String(req.body.nama || '').trim();
  const nim = String(req.body.nim || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const prodi = String(req.body.prodi || '').trim();
  const prodiId = Number(req.body.prodi_id);
  const password = req.body.password;

  if (!nama || !nim || !email || !password || !Number.isInteger(prodiId) || prodiId < 1) {
    return res.status(400).json({
      success: false,
      message: 'Nama, NIM, email kampus, program studi, dan password wajib diisi.',
    });
  }

  if (nama.length > 100 || nim.length > 20 || email.length > 100 || prodi.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Panjang nama, NIM, email, atau program studi melebihi batas.',
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Format email tidak valid.',
    });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password harus terdiri dari minimal 8 karakter.',
    });
  }

  let connection;
  let transactionStarted = false;
  try {
    const scope = getProdiScope(req.user, 'p', 'j');
    const [prodiRows] = await pool.query(
      `SELECT p.id, p.nama_prodi, j.campus_id FROM prodi p JOIN jurusan j ON j.id = p.jurusan_id
       WHERE p.id = ? AND ${scope.sql} LIMIT 1`,
      [prodiId, ...scope.params]
    );
    if (!prodiRows.length) {
      return res.status(403).json({ success: false, message: 'Prodi di luar cakupan admin.' });
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const hashedPassword = await bcrypt.hash(password, 10);
    const [userResult] = await connection.query(
      'INSERT INTO users (email, password, role, campus_id, display_name) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, 'mahasiswa', prodiRows[0].campus_id, nama]
    );
    const [mahasiswaResult] = await connection.query(
      'INSERT INTO mahasiswa (user_id, nim, nama, prodi, prodi_id) VALUES (?, ?, ?, ?, ?)',
      [userResult.insertId, nim, nama, prodiRows[0].nama_prodi, prodiId]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: 'Akun mahasiswa berhasil ditambahkan.',
      data: {
        id: mahasiswaResult.insertId,
        nim,
        nama,
        email,
        prodi: prodiRows[0].nama_prodi,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('createMahasiswa rollback Error:', rollbackError);
      }
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Email atau NIM sudah terdaftar.',
      });
    }

    console.error('createMahasiswa Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan akun mahasiswa.',
    });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getMahasiswaList,
  createMahasiswa,
};
