const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const normalizeSlug = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const createCampus = async (req, res) => {
  const name = String(req.body.nama || '').trim();
  const adminName = String(req.body.nama_admin || '').trim();
  const email = String(req.body.email_admin || '').trim().toLowerCase();
  const password = req.body.password_admin;

  if (!name || !adminName || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Nama kampus, nama admin, email admin, dan password awal wajib diisi.',
    });
  }
  if (name.length > 150 || adminName.length > 100 || email.length > 100) {
    return res.status(400).json({ success: false, message: 'Panjang data melebihi batas.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Format email admin tidak valid.' });
  }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ success: false, message: 'Password harus 8-72 byte.' });
  }

  const slug = normalizeSlug(req.body.slug || name);
  if (!slug || slug.length > 100) {
    return res.status(400).json({ success: false, message: 'Slug kampus tidak valid.' });
  }

  let connection;
  let transactionStarted = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;
    const [campusResult] = await connection.query(
      'INSERT INTO campuses (nama, slug) VALUES (?, ?)',
      [name, slug]
    );
    const hash = await bcrypt.hash(password, 10);
    const [userResult] = await connection.query(
      `INSERT INTO users (email, password, role, campus_id, display_name)
       VALUES (?, ?, 'admin_kampus', ?, ?)`,
      [email, hash, campusResult.insertId, adminName]
    );
    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: 'Kampus dan admin kampus berhasil dibuat.',
      data: {
        campus: { id: campusResult.insertId, nama: name, slug },
        admin: { id: userResult.insertId, nama: adminName, email, role: 'admin_kampus' },
      },
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('createCampus rollback Error:', rollbackError);
      }
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Slug kampus atau email admin sudah digunakan.',
      });
    }
    console.error('createCampus Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat kampus.' });
  } finally {
    if (connection) connection.release();
  }
};

const listCampuses = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id, c.nama, c.slug, c.created_at,
             COUNT(DISTINCT j.id) AS jumlah_jurusan,
             COUNT(DISTINCT d.id) AS jumlah_dosen
      FROM campuses c
      LEFT JOIN jurusan j ON j.campus_id = c.id
      LEFT JOIN prodi p ON p.jurusan_id = j.id
      LEFT JOIN dosen d ON d.prodi_id = p.id
      GROUP BY c.id, c.nama, c.slug, c.created_at
      ORDER BY c.nama
    `);
    return res.json({ success: true, total: rows.length, data: rows });
  } catch (error) {
    console.error('listCampuses Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar kampus.' });
  }
};

const createCampusAdmin = async (req, res) => {
  const campusId = Number(req.body.campus_id);
  const name = String(req.body.nama || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = req.body.password;
  if (!Number.isInteger(campusId) || campusId < 1 || !name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Kampus, nama, email, dan password wajib diisi.' });
  }
  if (name.length > 100 || email.length > 100) {
    return res.status(400).json({ success: false, message: 'Nama atau email melebihi batas panjang.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Format email tidak valid.' });
  }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ success: false, message: 'Password harus 8-72 byte.' });
  }
  try {
    const [campus] = await pool.query('SELECT id FROM campuses WHERE id = ? LIMIT 1', [campusId]);
    if (!campus.length) return res.status(404).json({ success: false, message: 'Kampus tidak ditemukan.' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (email, password, role, campus_id, display_name)
       VALUES (?, ?, 'admin_kampus', ?, ?)`,
      [email, hash, campusId, name]
    );
    return res.status(201).json({
      success: true,
      message: 'Admin kampus berhasil dibuat.',
      data: { id: result.insertId, nama: name, email, campus_id: campusId, role: 'admin_kampus' },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Email admin sudah terdaftar.' });
    }
    console.error('createCampusAdmin Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat admin kampus.' });
  }
};

const listManagedAdmins = async (req, res) => {
  try {
    const campusId = req.user.role === 'superadmin'
      ? Number(req.query.campus_id || 0)
      : Number(req.user.campus_id);
    if (!campusId) {
      return res.status(400).json({ success: false, message: 'campus_id wajib ditentukan.' });
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.display_name, u.role, u.campus_id, u.managed_jurusan_id,
              u.managed_prodi_id, j.nama_jurusan, p.nama_prodi
       FROM users u
       LEFT JOIN jurusan j ON j.id = u.managed_jurusan_id
       LEFT JOIN prodi p ON p.id = u.managed_prodi_id
       WHERE u.campus_id = ?
         AND u.role IN ('admin_kampus', 'admin_prodi')
       ORDER BY u.role, u.email`,
      [campusId]
    );
    return res.json({ success: true, total: rows.length, data: rows });
  } catch (error) {
    console.error('listManagedAdmins Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil akun admin.' });
  }
};

const createProdiAdmin = async (req, res) => {
  if (req.user.role !== 'admin_kampus') {
    return res.status(403).json({
      success: false,
      message: 'Hanya admin kampus yang dapat membuat admin jurusan/prodi.',
    });
  }

  const email = String(req.body.email || '').trim().toLowerCase();
  const displayName = String(req.body.nama || '').trim();
  const password = req.body.password;
  const scopeType = req.body.scope_type;
  if (!['jurusan', 'prodi'].includes(scopeType)) {
    return res.status(400).json({ success: false, message: 'scope_type harus jurusan atau prodi.' });
  }
  const scopeId = Number(scopeType === 'jurusan' ? req.body.jurusan_id : req.body.prodi_id);
  if (!email || !displayName || !Number.isInteger(scopeId) || scopeId < 1 || !password) {
    return res.status(400).json({ success: false, message: 'Nama, email, lingkup jurusan/prodi, dan password wajib diisi.' });
  }
  if (email.length > 100 || displayName.length > 100) {
    return res.status(400).json({ success: false, message: 'Nama atau email melebihi batas panjang.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Format email tidak valid.' });
  }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ success: false, message: 'Password harus 8-72 byte.' });
  }

  let connection;
  try {
    const [unit] = scopeType === 'jurusan'
      ? await pool.query(
          'SELECT id AS jurusan_id, NULL AS prodi_id FROM jurusan WHERE id = ? AND campus_id = ? LIMIT 1',
          [scopeId, req.user.campus_id]
        )
      : await pool.query(
          `SELECT p.id AS prodi_id, j.id AS jurusan_id
           FROM prodi p JOIN jurusan j ON j.id = p.jurusan_id
           WHERE p.id = ? AND j.campus_id = ? LIMIT 1`,
          [scopeId, req.user.campus_id]
        );
    if (!unit.length) {
      return res.status(404).json({ success: false, message: 'Jurusan/prodi tidak ditemukan di kampus Anda.' });
    }

    connection = await pool.getConnection();
    const hash = await bcrypt.hash(password, 10);
    const [result] = await connection.query(
      `INSERT INTO users (email, password, role, campus_id, display_name, managed_jurusan_id, managed_prodi_id)
       VALUES (?, ?, 'admin_prodi', ?, ?, ?, ?)`,
      [email, hash, req.user.campus_id, displayName, unit[0].jurusan_id, unit[0].prodi_id]
    );
    return res.status(201).json({
      success: true,
      message: 'Admin prodi berhasil dibuat.',
      data: {
        id: result.insertId, nama: displayName, email, role: 'admin_prodi',
        managed_jurusan_id: unit[0].jurusan_id,
        managed_prodi_id: unit[0].prodi_id,
      },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Email admin sudah terdaftar.' });
    }
    console.error('createProdiAdmin Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat admin prodi.' });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  createCampus,
  createCampusAdmin,
  listCampuses,
  listManagedAdmins,
  createProdiAdmin,
};
