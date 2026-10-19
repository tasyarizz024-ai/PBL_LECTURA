const { pool } = require('../config/db');
const { getTenantViewScope } = require('../utils/tenantScope');

/**
 * GET /api/log-aktivitas
 * Log Aktivitas Lokasi (Admin)
 * Menggunakan view `v_log_aktivitas`
 * Query params:
 *   - dosen_id: number (filter per dosen)
 *   - date: string YYYY-MM-DD (filter tanggal tertentu)
 *   - start_date: string YYYY-MM-DD (rentang tanggal awal)
 *   - end_date: string YYYY-MM-DD (rentang tanggal akhir)
 *   - page: number (default 1)
 *   - limit: number (default 20)
 */
const getLogAktivitas = async (req, res) => {
  try {
    const { dosen_id, date, start_date, end_date, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const scope = getTenantViewScope(req.user);
    let whereClause = ` WHERE ${scope.sql}`;
    const queryParams = [...scope.params];

    // Filter by dosen_id
    if (dosen_id) {
      whereClause += ' AND dosen_id = ?';
      queryParams.push(Number(dosen_id));
    }

    // Filter tanggal spesifik tunggal
    if (date && date.trim() !== '') {
      whereClause += ' AND DATE(recorded_at) = ?';
      queryParams.push(date.trim());
    } else {
      // Filter rentang tanggal (mendukung start_date / date_from dan end_date / date_to)
      const startDateVal = (start_date || req.query.date_from || '').trim();
      const endDateVal = (end_date || req.query.date_to || '').trim();
      if (startDateVal !== '') {
        whereClause += ' AND DATE(recorded_at) >= ?';
        queryParams.push(startDateVal);
      }
      if (endDateVal !== '') {
        whereClause += ' AND DATE(recorded_at) <= ?';
        queryParams.push(endDateVal);
      }
    }


    // 1. Hitung total baris yang cocok untuk pagination
    const countSql = `SELECT COUNT(*) AS total FROM v_log_aktivitas${whereClause}`;
    const [countRows] = await pool.query(countSql, queryParams);
    const totalRecords = countRows[0].total;
    const totalPages = Math.ceil(totalRecords / limitNum) || 1;

    // 2. Query data dengan LIMIT dan OFFSET
    const dataSql = `
      SELECT 
        id AS log_id, 
        dosen_id, 
        nip, 
        nama_dosen, 
        gedung_id, 
        nama_gedung, 
        latitude, 
        longitude, 
        recorded_at AS waktu_log,
        CASE
          WHEN recorded_at >= NOW() - INTERVAL 15 MINUTE THEN 'realtime'
          ELSE 'tidak_diketahui'
        END AS status_type,
        NULL AS probabilitas
      FROM v_log_aktivitas
      ${whereClause}
      ORDER BY recorded_at DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataSql, [...queryParams, limitNum, offset]);

    return res.status(200).json({
      success: true,
      pagination: {
        total_records: totalRecords,
        total_pages: totalPages,
        current_page: pageNum,
        per_page: limitNum,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1,
      },
      filters: {
        dosen_id: dosen_id ? Number(dosen_id) : null,
        date: date || null,
        start_date: start_date || null,
        end_date: end_date || null,
      },
      data: rows,
    });
  } catch (error) {
    console.error('getLogAktivitas Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat log aktivitas lokasi.',
      error: error.message,
    });
  }
};

module.exports = {
  getLogAktivitas,
};
