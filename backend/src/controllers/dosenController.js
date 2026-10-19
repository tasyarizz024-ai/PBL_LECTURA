const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { getProdiScope } = require('../utils/tenantScope');

/**
 * GET /api/dosen
 * Ambil daftar dosen (dukungan filter by prodi_id dan search by nama/NIP)
 * Sesuai query di 03_crud_queries.sql
 */
const getDosenList = async (req, res) => {
  try {
    const { prodi_id, search } = req.query;

    let query = `
      SELECT 
        d.id, 
        d.user_id,
        d.nip, 
        d.nama, 
        d.jabatan, 
        d.foto, 
        d.gps_enabled, 
        d.prodi_id, 
        p.nama_prodi, 
        j.id AS jurusan_id,
        j.nama_jurusan, 
        u.email
      FROM dosen d
      JOIN prodi p   ON d.prodi_id = p.id
      JOIN jurusan j ON p.jurusan_id = j.id
      JOIN users u   ON d.user_id = u.id
      WHERE ${getProdiScope(req.user, 'p', 'j').sql}
    `;
    const queryParams = [...getProdiScope(req.user, 'p', 'j').params];

    // Filter berdasarkan Prodi
    if (prodi_id) {
      query += ` AND d.prodi_id = ?`;
      queryParams.push(Number(prodi_id));
    }

    // Pencarian berdasarkan Nama atau NIP
    if (search && search.trim() !== '') {
      query += ` AND (d.nama LIKE ? OR d.nip LIKE ?)`;
      const term = `%${search.trim()}%`;
      queryParams.push(term, term);
    }

    query += ` ORDER BY d.nama ASC`;

    const [rows] = await pool.query(query, queryParams);

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('getDosenList Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data dosen.',
      error: error.message,
    });
  }
};

/**
 * GET /api/dosen/:id
 * Ambil detail satu dosen berdasarkan ID
 */
const getDosenById = async (req, res) => {
  try {
    const { id } = req.params;

    const scope = getProdiScope(req.user, 'p', 'j');
    const query = `
      SELECT 
        d.id, 
        d.user_id,
        d.nip, 
        d.nama, 
        d.jabatan, 
        d.foto, 
        d.gps_enabled, 
        d.prodi_id, 
        p.nama_prodi, 
        j.id AS jurusan_id,
        j.nama_jurusan, 
        u.email
      FROM dosen d
      JOIN prodi p   ON d.prodi_id = p.id
      JOIN jurusan j ON p.jurusan_id = j.id
      JOIN users u   ON d.user_id = u.id
      WHERE d.id = ? AND ${scope.sql}
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [id, ...scope.params]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Dosen dengan ID ${id} tidak ditemukan.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error('getDosenById Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail dosen.',
      error: error.message,
    });
  }
};

/**
 * POST /api/dosen
 * Tambah dosen baru menggunakan Stored Procedure `sp_tambah_dosen`
 * Sesuai database/04_views_sp_triggers.sql
 */
const createDosen = async (req, res) => {
  try {
    const { email, password, prodi_id, nip, nama, jabatan, foto } = req.body;

    // Validasi input wajib
    if (!email || !prodi_id || !nip || !nama) {
      return res.status(400).json({
        success: false,
        message: 'Field email, prodi_id, nip, dan nama wajib diisi.',
      });
    }

    const scope = getProdiScope(req.user, 'p', 'j');
    const [prodiRows] = await pool.query(
      `SELECT p.id, j.campus_id FROM prodi p JOIN jurusan j ON j.id = p.jurusan_id
       WHERE p.id = ? AND ${scope.sql} LIMIT 1`,
      [Number(prodi_id), ...scope.params]
    );
    if (!prodiRows.length) {
      return res.status(403).json({ success: false, message: 'Prodi di luar cakupan admin.' });
    }

    // Default password jika tidak diberikan
    const plainPassword = password || 'dosen123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Eksekusi Stored Procedure sp_tambah_dosen
    // Parameter: (p_email, p_password, p_prodi_id, p_nip, p_nama, p_jabatan)
    await pool.query(
      'CALL sp_tambah_dosen(?, ?, ?, ?, ?, ?, ?)',
      [
        email.trim(),
        hashedPassword,
        Number(prodi_id),
        prodiRows[0].campus_id,
        nip.trim(),
        nama.trim(),
        jabatan ? jabatan.trim() : 'Asisten Ahli',
      ]
    );

    // Update foto jika disertakan
    if (foto) {
      await pool.query('UPDATE dosen SET foto = ? WHERE nip = ?', [foto.trim(), nip.trim()]);
    }

    // Ambil data dosen yang baru saja dibuat
    const [createdRows] = await pool.query(
      `
      SELECT 
        d.id, 
        d.user_id,
        d.nip, 
        d.nama, 
        d.jabatan, 
        d.foto, 
        d.gps_enabled, 
        d.prodi_id, 
        p.nama_prodi, 
        j.nama_jurusan, 
        u.email
      FROM dosen d
      JOIN prodi p   ON d.prodi_id = p.id
      JOIN jurusan j ON p.jurusan_id = j.id
      JOIN users u   ON d.user_id = u.id
      WHERE d.nip = ?
      LIMIT 1
      `,
      [nip.trim()]
    );

    return res.status(201).json({
      success: true,
      message: 'Dosen baru berhasil ditambahkan.',
      data: createdRows[0],
    });
  } catch (error) {
    console.error('createDosen Error:', error);

    // Tangani duplicate entry (NIP atau Email sudah ada)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'NIP atau Email sudah terdaftar dalam sistem.',
        detail: error.sqlMessage,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan dosen baru.',
      error: error.message,
    });
  }
};

/**
 * PUT /api/dosen/:id
 * Update data dosen
 * Sesuai query di 03_crud_queries.sql
 */
const updateDosen = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, nip, jabatan, prodi_id, foto, gps_enabled, email } = req.body;

    // Periksa apakah dosen ada
    const scope = getProdiScope(req.user, 'p', 'j');
    const [existing] = await pool.query(
      `SELECT d.* FROM dosen d JOIN prodi p ON p.id = d.prodi_id
       JOIN jurusan j ON j.id = p.jurusan_id
       WHERE d.id = ? AND ${scope.sql}`,
      [id, ...scope.params]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Dosen dengan ID ${id} tidak ditemukan.`,
      });
    }

    const currentDosen = existing[0];
    if (prodi_id !== undefined) {
      const [targetProdi] = await pool.query(
        `SELECT p.id FROM prodi p JOIN jurusan j ON j.id = p.jurusan_id
         WHERE p.id = ? AND ${scope.sql} LIMIT 1`,
        [Number(prodi_id), ...scope.params]
      );
      if (!targetProdi.length) {
        return res.status(403).json({ success: false, message: 'Prodi tujuan di luar cakupan admin.' });
      }
    }

    if (gps_enabled !== undefined && ![false, 0, '0'].includes(gps_enabled)) {
      return res.status(403).json({
        success: false,
        message: 'Persetujuan berbagi lokasi hanya dapat diaktifkan oleh dosen yang bersangkutan.',
      });
    }

    // Update data pada tabel dosen
    await pool.query(
      `
      UPDATE dosen
      SET 
        nama = ?,
        nip = ?,
        jabatan = ?,
        prodi_id = ?,
        foto = ?,
        gps_enabled = ?
      WHERE id = ?
      `,
      [
        nama !== undefined ? nama : currentDosen.nama,
        nip !== undefined ? nip : currentDosen.nip,
        jabatan !== undefined ? jabatan : currentDosen.jabatan,
        prodi_id !== undefined ? Number(prodi_id) : currentDosen.prodi_id,
        foto !== undefined ? foto : currentDosen.foto,
        gps_enabled !== undefined ? 0 : currentDosen.gps_enabled,
        id,
      ]
    );

    if (gps_enabled !== undefined) {
      await pool.query(
        `
        INSERT INTO current_status (dosen_id, status_type, gedung_id, probabilitas, last_updated)
        VALUES (?, 'tidak_diketahui', NULL, NULL, NOW())
        ON DUPLICATE KEY UPDATE
          status_type = 'tidak_diketahui',
          gedung_id = NULL,
          probabilitas = NULL,
          last_updated = NOW()
        `,
        [id]
      );
    }

    // Update email di tabel users jika diikutsertakan
    if (email && email.trim() !== '') {
      await pool.query('UPDATE users SET email = ? WHERE id = ?', [email.trim(), currentDosen.user_id]);
    }

    // Ambil data terbaru
    const [updatedRows] = await pool.query(
      `
      SELECT 
        d.id, 
        d.user_id,
        d.nip, 
        d.nama, 
        d.jabatan, 
        d.foto, 
        d.gps_enabled, 
        d.prodi_id, 
        p.nama_prodi, 
        j.nama_jurusan, 
        u.email
      FROM dosen d
      JOIN prodi p   ON d.prodi_id = p.id
      JOIN jurusan j ON p.jurusan_id = j.id
      JOIN users u   ON d.user_id = u.id
      WHERE d.id = ?
      LIMIT 1
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Data dosen berhasil diperbarui.',
      data: updatedRows[0],
    });
  } catch (error) {
    console.error('updateDosen Error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'NIP atau Email sudah digunakan oleh dosen lain.',
        detail: error.sqlMessage,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data dosen.',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/dosen/:id
 * Hapus dosen lewat user terkait agar ter-cascade otomatis
 * Sesuai query 03_crud_queries.sql:
 * DELETE FROM users WHERE id = (SELECT user_id FROM dosen WHERE id = ?);
 */
const deleteDosen = async (req, res) => {
  try {
    const { id } = req.params;

    // Periksa eksistensi dosen dan dapatkan user_id
    const [rows] = await pool.query(
      `SELECT d.id, d.user_id, d.nama, d.nip
       FROM dosen d JOIN prodi p ON p.id = d.prodi_id
       JOIN jurusan j ON j.id = p.jurusan_id
       WHERE d.id = ? AND ${getProdiScope(req.user, 'p', 'j').sql}`,
      [id, ...getProdiScope(req.user, 'p', 'j').params]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Dosen dengan ID ${id} tidak ditemukan.`,
      });
    }

    const { user_id, nama, nip } = rows[0];

    // Hapus lewat tabel users (akan cascade ke dosen, log, current_status, jadwal_mengajar)
    await pool.query('DELETE FROM users WHERE id = ?', [user_id]);

    return res.status(200).json({
      success: true,
      message: `Dosen '${nama}' (NIP: ${nip}) berhasil dihapus.`,
      deleted_id: Number(id),
    });
  } catch (error) {
    console.error('deleteDosen Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus data dosen.',
      error: error.message,
    });
  }
};

/**
 * GET /api/dosen/meta/prodi
 * Ambil daftar prodi untuk opsi dropdown filter/form tambah
 * Sesuai query 03_crud_queries.sql bagian 7
 */
const getProdiList = async (req, res) => {
  try {
    const scope = getProdiScope(req.user, 'p', 'j');
    const query = `
      SELECT p.id, p.nama_prodi, j.id AS jurusan_id, j.nama_jurusan
      FROM prodi p
      JOIN jurusan j ON j.id = p.jurusan_id
      WHERE ${scope.sql}
      ORDER BY j.nama_jurusan ASC, p.nama_prodi ASC
    `;
    const [rows] = await pool.query(query, scope.params);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('getProdiList Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar prodi.',
      error: error.message,
    });
  }
};

module.exports = {
  getDosenList,
  getDosenById,
  createDosen,
  updateDosen,
  deleteDosen,
  getProdiList,
};
