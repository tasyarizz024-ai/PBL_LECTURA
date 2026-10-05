const { pool } = require('../config/db');

/**
 * CRUD data master jurusan & prodi.
 *
 * Hierarki: Jurusan → Prodi → Dosen. Controller ini sengaja dibuat satu file
 * karena keduanya saling terkait (prodi memvalidasi jurusan_id, jurusan
 * menolak dihapus selama masih ada prodi anak), dan endpoint-nya berada pada
 * satu grup route: /api/jurusan-prodi.
 */

// ── HELPER ────────────────────────────────────────────────────────────────

/** Normalisasi input nama: trim + collapse spasi ganda. */
const normalizeName = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

/** True bila error berasal dari UNIQUE constraint MySQL. */
const isDuplicateError = (error) => error && error.code === 'ER_DUP_ENTRY';

// ── JURUSAN ───────────────────────────────────────────────────────────────

/**
 * GET /api/jurusan-prodi/jurusan
 * List semua jurusan + jumlah prodi di dalamnya.
 */
const getJurusanList = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT j.id, j.nama_jurusan, COUNT(p.id) AS jumlah_prodi
      FROM jurusan j
      LEFT JOIN prodi p ON p.jurusan_id = j.id
      GROUP BY j.id, j.nama_jurusan
      ORDER BY j.nama_jurusan ASC
    `);

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('getJurusanList Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data jurusan.',
      error: error.message,
    });
  }
};

/**
 * GET /api/jurusan-prodi/jurusan/:id
 * Detail satu jurusan beserta prodi-prodi di bawahnya.
 */
const getJurusanById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT id, nama_jurusan FROM jurusan WHERE id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Jurusan dengan ID ${id} tidak ditemukan.`,
      });
    }

    const [prodi] = await pool.query(
      `SELECT id, jurusan_id, nama_prodi FROM prodi WHERE jurusan_id = ? ORDER BY nama_prodi ASC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: { ...rows[0], prodi },
    });
  } catch (error) {
    console.error('getJurusanById Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail jurusan.',
      error: error.message,
    });
  }
};

/**
 * POST /api/jurusan-prodi/jurusan
 * Body: { nama_jurusan }
 */
const createJurusan = async (req, res) => {
  const namaJurusan = normalizeName(req.body.nama_jurusan ?? req.body.nama);

  if (!namaJurusan) {
    return res.status(400).json({
      success: false,
      message: 'Nama jurusan wajib diisi.',
    });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO jurusan (nama_jurusan) VALUES (?)`,
      [namaJurusan]
    );

    const [rows] = await pool.query(
      `SELECT id, nama_jurusan FROM jurusan WHERE id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: `Jurusan "${namaJurusan}" berhasil ditambahkan.`,
      data: rows[0],
    });
  } catch (error) {
    console.error('createJurusan Error:', error);
    if (isDuplicateError(error)) {
      return res.status(409).json({
        success: false,
        message: `Jurusan "${namaJurusan}" sudah ada.`,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan jurusan.',
      error: error.message,
    });
  }
};

/**
 * PUT /api/jurusan-prodi/jurusan/:id
 * Body: { nama_jurusan }
 */
const updateJurusan = async (req, res) => {
  const { id } = req.params;
  const namaJurusan = normalizeName(req.body.nama_jurusan ?? req.body.nama);

  if (!namaJurusan) {
    return res.status(400).json({
      success: false,
      message: 'Nama jurusan wajib diisi.',
    });
  }

  try {
    const [existing] = await pool.query(
      `SELECT id FROM jurusan WHERE id = ? LIMIT 1`,
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Jurusan dengan ID ${id} tidak ditemukan.`,
      });
    }

    await pool.query(`UPDATE jurusan SET nama_jurusan = ? WHERE id = ?`, [
      namaJurusan,
      id,
    ]);

    const [rows] = await pool.query(
      `SELECT id, nama_jurusan FROM jurusan WHERE id = ?`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: `Jurusan berhasil diperbarui menjadi "${namaJurusan}".`,
      data: rows[0],
    });
  } catch (error) {
    console.error('updateJurusan Error:', error);
    if (isDuplicateError(error)) {
      return res.status(409).json({
        success: false,
        message: `Jurusan "${namaJurusan}" sudah ada.`,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui jurusan.',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/jurusan-prodi/jurusan/:id
 * Ditolak bila masih ada prodi yang menempel. Hapus/pindahkan prodi dulu.
 */
const deleteJurusan = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query(
      `SELECT id, nama_jurusan FROM jurusan WHERE id = ? LIMIT 1`,
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Jurusan dengan ID ${id} tidak ditemukan.`,
      });
    }

    const [terpakai] = await pool.query(
      `SELECT COUNT(*) AS total FROM prodi WHERE jurusan_id = ?`,
      [id]
    );

    if (terpakai[0].total > 0) {
      const [dosen] = await pool.query(
        `SELECT COUNT(*) AS total FROM dosen WHERE prodi_id IN (SELECT id FROM prodi WHERE jurusan_id = ?)`,
        [id]
      );
      const suffix =
        dosen[0].total > 0
          ? ' Hapus atau pindahkan prodi dan dosen terkait terlebih dahulu.'
          : ' Hapus atau pindahkan prodi terkait terlebih dahulu.';

      return res.status(409).json({
        success: false,
        message: `Jurusan "${existing[0].nama_jurusan}" masih memiliki ${terpakai[0].total} prodi.${suffix}`,
      });
    }

    await pool.query(`DELETE FROM jurusan WHERE id = ?`, [id]);

    return res.status(200).json({
      success: true,
      message: `Jurusan "${existing[0].nama_jurusan}" berhasil dihapus.`,
    });
  } catch (error) {
    console.error('deleteJurusan Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus jurusan.',
      error: error.message,
    });
  }
};

// ── PRODI ─────────────────────────────────────────────────────────────────

/**
 * GET /api/jurusan-prodi/prodi
 * List prodi + nama jurusan induknya (dipakai untuk dropdown filter
 * di Dashboard Cari Dosen).
 * Query param: ?jurusan_id= (opsional) &search= (opsional)
 */
const getProdiList = async (req, res) => {
  try {
    const { jurusan_id: jurusanId, search } = req.query;

    let query = `
      SELECT p.id, p.jurusan_id, p.nama_prodi, j.nama_jurusan,
             (SELECT COUNT(*) FROM dosen d WHERE d.prodi_id = p.id) AS jumlah_dosen
      FROM prodi p
      JOIN jurusan j ON j.id = p.jurusan_id
    `;
    const params = [];

    const conditions = [];
    if (jurusanId) {
      conditions.push(`p.jurusan_id = ?`);
      params.push(jurusanId);
    }
    if (search && String(search).trim() !== '') {
      conditions.push(`(p.nama_prodi LIKE ? OR j.nama_jurusan LIKE ?)`);
      params.push(`%${String(search).trim()}%`, `%${String(search).trim()}%`);
    }
    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;

    query += ` ORDER BY j.nama_jurusan ASC, p.nama_prodi ASC`;

    const [rows] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      total: rows.length,
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
 * GET /api/jurusan-prodi/prodi/:id
 */
const getProdiById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT p.id, p.jurusan_id, p.nama_prodi, j.nama_jurusan
       FROM prodi p JOIN jurusan j ON j.id = p.jurusan_id
       WHERE p.id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Prodi dengan ID ${id} tidak ditemukan.`,
      });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('getProdiById Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail prodi.',
      error: error.message,
    });
  }
};

/**
 * POST /api/jurusan-prodi/prodi
 * Body: { nama_prodi, jurusan_id }  (jurusan_id wajib, dari dropdown)
 */
const createProdi = async (req, res) => {
  const namaProdi = normalizeName(req.body.nama_prodi ?? req.body.nama);
  const jurusanId = req.body.jurusan_id;

  if (!namaProdi) {
    return res.status(400).json({
      success: false,
      message: 'Nama prodi wajib diisi.',
    });
  }
  if (!jurusanId) {
    return res.status(400).json({
      success: false,
      message: 'Jurusan induk wajib dipilih.',
    });
  }

  try {
    const [jurusan] = await pool.query(
      `SELECT id FROM jurusan WHERE id = ? LIMIT 1`,
      [jurusanId]
    );
    if (jurusan.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Jurusan dengan ID ${jurusanId} tidak ditemukan.`,
      });
    }

    const [result] = await pool.query(
      `INSERT INTO prodi (jurusan_id, nama_prodi) VALUES (?, ?)`,
      [jurusanId, namaProdi]
    );

    const [rows] = await pool.query(
      `SELECT p.id, p.jurusan_id, p.nama_prodi, j.nama_jurusan
       FROM prodi p JOIN jurusan j ON j.id = p.jurusan_id WHERE p.id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: `Prodi "${namaProdi}" berhasil ditambahkan.`,
      data: rows[0],
    });
  } catch (error) {
    console.error('createProdi Error:', error);
    if (isDuplicateError(error)) {
      return res.status(409).json({
        success: false,
        message: `Prodi "${namaProdi}" sudah ada di jurusan tersebut.`,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan prodi.',
      error: error.message,
    });
  }
};

/**
 * PUT /api/jurusan-prodi/prodi/:id
 * Body: { nama_prodi, jurusan_id }
 */
const updateProdi = async (req, res) => {
  const { id } = req.params;
  const namaProdi = normalizeName(req.body.nama_prodi ?? req.body.nama);
  const jurusanId = req.body.jurusan_id;

  if (!namaProdi) {
    return res.status(400).json({
      success: false,
      message: 'Nama prodi wajib diisi.',
    });
  }
  if (!jurusanId) {
    return res.status(400).json({
      success: false,
      message: 'Jurusan induk wajib dipilih.',
    });
  }

  try {
    const [existing] = await pool.query(
      `SELECT id FROM prodi WHERE id = ? LIMIT 1`,
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Prodi dengan ID ${id} tidak ditemukan.`,
      });
    }

    const [jurusan] = await pool.query(
      `SELECT id FROM jurusan WHERE id = ? LIMIT 1`,
      [jurusanId]
    );
    if (jurusan.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Jurusan dengan ID ${jurusanId} tidak ditemukan.`,
      });
    }

    await pool.query(`UPDATE prodi SET nama_prodi = ?, jurusan_id = ? WHERE id = ?`, [
      namaProdi,
      jurusanId,
      id,
    ]);

    const [rows] = await pool.query(
      `SELECT p.id, p.jurusan_id, p.nama_prodi, j.nama_jurusan
       FROM prodi p JOIN jurusan j ON j.id = p.jurusan_id WHERE p.id = ?`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: `Prodi berhasil diperbarui menjadi "${namaProdi}".`,
      data: rows[0],
    });
  } catch (error) {
    console.error('updateProdi Error:', error);
    if (isDuplicateError(error)) {
      return res.status(409).json({
        success: false,
        message: `Prodi "${namaProdi}" sudah ada di jurusan tersebut.`,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui prodi.',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/jurusan-prodi/prodi/:id
 * Ditolak bila masih ada dosen yang memakai prodi ini.
 */
const deleteProdi = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query(
      `SELECT id, nama_prodi FROM prodi WHERE id = ? LIMIT 1`,
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Prodi dengan ID ${id} tidak ditemukan.`,
      });
    }

    const [dosen] = await pool.query(
      `SELECT COUNT(*) AS total FROM dosen WHERE prodi_id = ?`,
      [id]
    );
    if (dosen[0].total > 0) {
      return res.status(409).json({
        success: false,
        message: `Prodi "${existing[0].nama_prodi}" masih digunakan oleh ${dosen[0].total} dosen. Pindahkan dosen terkait terlebih dahulu.`,
      });
    }

    await pool.query(`DELETE FROM prodi WHERE id = ?`, [id]);

    return res.status(200).json({
      success: true,
      message: `Prodi "${existing[0].nama_prodi}" berhasil dihapus.`,
    });
  } catch (error) {
    console.error('deleteProdi Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus prodi.',
      error: error.message,
    });
  }
};

module.exports = {
  getJurusanList,
  getJurusanById,
  createJurusan,
  updateJurusan,
  deleteJurusan,
  getProdiList,
  getProdiById,
  createProdi,
  updateProdi,
  deleteProdi,
};
