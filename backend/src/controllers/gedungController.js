const { pool } = require('../config/db');

/**
 * GET /api/gedung
 * Ambil semua data gedung dan radius geofence
 * Sesuai query di 03_crud_queries.sql
 */
const getGedungList = async (req, res) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT id, nama_gedung, latitude, longitude, radius_meter
      FROM gedung
    `;
    const queryParams = [];

    if (search && search.trim() !== '') {
      query += ` WHERE nama_gedung LIKE ?`;
      queryParams.push(`%${search.trim()}%`);
    }

    query += ` ORDER BY nama_gedung ASC`;

    const [rows] = await pool.query(query, queryParams);

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('getGedungList Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data gedung.',
      error: error.message,
    });
  }
};

/**
 * GET /api/gedung/:id
 * Ambil detail satu gedung berdasarkan ID
 */
const getGedungById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT id, nama_gedung, latitude, longitude, radius_meter FROM gedung WHERE id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Gedung dengan ID ${id} tidak ditemukan.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error('getGedungById Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail gedung.',
      error: error.message,
    });
  }
};

/**
 * POST /api/gedung
 * Tambah gedung dan geofence baru
 * Body: { nama_gedung (or nama), latitude, longitude, radius_meter }
 * Sesuai query di 03_crud_queries.sql
 */
const createGedung = async (req, res) => {
  try {
    const { nama_gedung, nama, latitude, longitude, radius_meter } = req.body;
    const gedungName = (nama_gedung || nama || '').trim();

    if (!gedungName || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Field nama_gedung, latitude, dan longitude wajib diisi.',
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radius = radius_meter !== undefined ? parseInt(radius_meter, 10) : 50;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Latitude tidak valid (harus berada di antara -90 dan 90).',
      });
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Longitude tidak valid (harus berada di antara -180 dan 180).',
      });
    }

    if (isNaN(radius) || radius <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Radius geofence harus bernilai angka positif (meter).',
      });
    }

    const [result] = await pool.query(
      `INSERT INTO gedung (nama_gedung, latitude, longitude, radius_meter) VALUES (?, ?, ?, ?)`,
      [gedungName, lat, lng, radius]
    );

    const [created] = await pool.query(
      `SELECT id, nama_gedung, latitude, longitude, radius_meter FROM gedung WHERE id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Gedung dan geofence baru berhasil ditambahkan.',
      data: created[0],
    });
  } catch (error) {
    console.error('createGedung Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan gedung baru.',
      error: error.message,
    });
  }
};

/**
 * PUT /api/gedung/:id
 * Update data gedung dan konfigurasi radius geofence
 * Sesuai query di 03_crud_queries.sql
 */
const updateGedung = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_gedung, nama, latitude, longitude, radius_meter } = req.body;

    // Periksa keberadaan gedung
    const [existing] = await pool.query('SELECT * FROM gedung WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Gedung dengan ID ${id} tidak ditemukan.`,
      });
    }

    const current = existing[0];
    const updatedNama = nama_gedung !== undefined ? nama_gedung.trim() : (nama !== undefined ? nama.trim() : current.nama_gedung);
    const updatedLat = latitude !== undefined ? parseFloat(latitude) : current.latitude;
    const updatedLng = longitude !== undefined ? parseFloat(longitude) : current.longitude;
    const updatedRadius = radius_meter !== undefined ? parseInt(radius_meter, 10) : current.radius_meter;

    if (isNaN(updatedLat) || updatedLat < -90 || updatedLat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Latitude tidak valid (harus berada di antara -90 dan 90).',
      });
    }

    if (isNaN(updatedLng) || updatedLng < -180 || updatedLng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Longitude tidak valid (harus berada di antara -180 dan 180).',
      });
    }

    if (isNaN(updatedRadius) || updatedRadius <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Radius geofence harus bernilai angka positif (meter).',
      });
    }

    await pool.query(
      `
      UPDATE gedung
      SET nama_gedung = ?, latitude = ?, longitude = ?, radius_meter = ?
      WHERE id = ?
      `,
      [updatedNama, updatedLat, updatedLng, updatedRadius, id]
    );

    const [updated] = await pool.query(
      `SELECT id, nama_gedung, latitude, longitude, radius_meter FROM gedung WHERE id = ?`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Data gedung dan geofence berhasil diperbarui.',
      data: updated[0],
    });
  } catch (error) {
    console.error('updateGedung Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data gedung.',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/gedung/:id
 * Hapus gedung
 * Sesuai query di 03_crud_queries.sql
 */
const deleteGedung = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT id, nama_gedung FROM gedung WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Gedung dengan ID ${id} tidak ditemukan.`,
      });
    }

    const gedungName = existing[0].nama_gedung;

    await pool.query('DELETE FROM gedung WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: `Gedung '${gedungName}' berhasil dihapus.`,
      deleted_id: Number(id),
    });
  } catch (error) {
    console.error('deleteGedung Error:', error);

    // Tangani foreign key constraint restrict (misal gedung sedang dipakai di jadwal_mengajar atau habit_summary)
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        success: false,
        message: 'Gedung tidak dapat dihapus karena masih terkait dengan data jadwal mengajar atau habit dosen.',
        detail: error.sqlMessage,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus data gedung.',
      error: error.message,
    });
  }
};

module.exports = {
  getGedungList,
  getGedungById,
  createGedung,
  updateGedung,
  deleteGedung,
};
