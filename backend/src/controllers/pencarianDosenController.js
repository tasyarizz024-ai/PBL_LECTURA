const { pool } = require('../config/db');

/**
 * GET /api/pencarian-dosen
 * Fitur pencarian dosen untuk Mahasiswa
 * Menggunakan view `v_pencarian_dosen`
 * Query params:
 *   - search: string (nama atau NIP)
 *   - prodi_id: number
 *   - status_type: enum ('realtime', 'prediksi', 'tidak_diketahui')
 */
const cariDosen = async (req, res) => {
  try {
    const { search, prodi_id, status_type } = req.query;

    let query = `
      SELECT 
        dosen_id,
        nip,
        nama,
        jabatan,
        foto,
        prodi_id,
        nama_prodi,
        jurusan_id,
        nama_jurusan,
        status_type,
        gedung_id,
        nama_gedung,
        probabilitas,
        last_updated
      FROM v_pencarian_dosen
      WHERE 1=1
    `;
    const queryParams = [];

    // Filter Prodi
    if (prodi_id) {
      query += ` AND prodi_id = ?`;
      queryParams.push(Number(prodi_id));
    }

    // Pencarian Nama atau NIP
    if (search && search.trim() !== '') {
      query += ` AND (nama LIKE ? OR nip LIKE ?)`;
      const term = `%${search.trim()}%`;
      queryParams.push(term, term);
    }

    // Filter Status (opsional)
    if (status_type && ['realtime', 'prediksi', 'tidak_diketahui'].includes(status_type.toLowerCase())) {
      query += ` AND status_type = ?`;
      queryParams.push(status_type.toLowerCase());
    }

    query += ` ORDER BY nama ASC`;

    const [rows] = await pool.query(query, queryParams);

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('cariDosen Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal melakukan pencarian dosen.',
      error: error.message,
    });
  }
};

/**
 * GET /api/pencarian-dosen/:id
 * Detail & Status Dosen untuk Mahasiswa
 * Menggabungkan:
 *   1. Profil Lengkap Dosen
 *   2. Status Terkini (realtime / prediksi + % probabilitas / tidak_diketahui) & Lokasi Peta Gedung
 *   3. Jadwal Mengajar Dosen Hari Ini (dari view v_jadwal_dosen)
 */
const getDetailDosen = async (req, res) => {
  try {
    const { id } = req.params;

    // Hari saat ini dalam bahasa Indonesia
    const hariIndo = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
    const currentDay = (req.query.hari || hariIndo[new Date().getDay()]).toLowerCase();

    // 1. Ambil data profil lengkap dan status terkini
    const query = `
      SELECT 
        d.id AS dosen_id,
        d.nip,
        d.nama,
        d.jabatan,
        d.foto,
        d.gps_enabled,
        u.email,
        p.id AS prodi_id,
        p.nama_prodi,
        j.id AS jurusan_id,
        j.nama_jurusan,
        COALESCE(cs.status_type, 'tidak_diketahui') AS status_type,
        cs.probabilitas,
        cs.last_updated,
        g.id AS gedung_id,
        g.nama_gedung,
        g.latitude,
        g.longitude,
        g.radius_meter
      FROM dosen d
      JOIN prodi p ON p.id = d.prodi_id
      JOIN jurusan j ON j.id = p.jurusan_id
      JOIN users u ON u.id = d.user_id
      LEFT JOIN current_status cs ON cs.dosen_id = d.id
      LEFT JOIN gedung g ON g.id = cs.gedung_id
      WHERE d.id = ?
      LIMIT 1
    `;

    const [dosenRows] = await pool.query(query, [id]);

    if (dosenRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Dosen dengan ID ${id} tidak ditemukan.`,
      });
    }

    const row = dosenRows[0];

    // 2. Ambil jadwal mengajar HARI INI dari view `v_jadwal_dosen`
    const [jadwalHariIni] = await pool.query(
      `
      SELECT 
        hari,
        jam_mulai,
        jam_selesai,
        mata_kuliah,
        nama_gedung
      FROM v_jadwal_dosen
      WHERE dosen_id = ? AND hari = ?
      ORDER BY jam_mulai ASC
      `,
      [id, currentDay]
    );

    // 3. Ambil juga semua jadwal mengajar dosen (sebagai konteks tambahan)
    const [semuaJadwal] = await pool.query(
      `
      SELECT 
        hari,
        jam_mulai,
        jam_selesai,
        mata_kuliah,
        nama_gedung
      FROM v_jadwal_dosen
      WHERE dosen_id = ?
      ORDER BY FIELD(hari, 'senin','selasa','rabu','kamis','jumat','sabtu','minggu'), jam_mulai ASC
      `,
      [id]
    );

    // 4. Jadwal prediksi dari habit_summary (hasil model ML)
    const [prediksiHariIni] = await pool.query(
      `
      SELECT hs.hari, hs.jam_mulai, hs.jam_selesai, hs.probabilitas, g.nama_gedung
      FROM habit_summary hs
      JOIN gedung g ON g.id = hs.gedung_id
      WHERE hs.dosen_id = ? AND hs.hari = ?
      ORDER BY hs.jam_mulai ASC
      `,
      [id, currentDay]
    );

    const [semuaPrediksi] = await pool.query(
      `
      SELECT hs.hari, hs.jam_mulai, hs.jam_selesai, hs.probabilitas, g.nama_gedung
      FROM habit_summary hs
      JOIN gedung g ON g.id = hs.gedung_id
      WHERE hs.dosen_id = ?
      ORDER BY FIELD(hs.hari, 'senin','selasa','rabu','kamis','jumat','sabtu','minggu'), hs.jam_mulai ASC
      `,
      [id]
    );

    // Format badge status sesuai panduan PRD
    let statusBadge = {
      label: 'Tidak diketahui',
      color: 'gray',
      confidence: null,
    };

    if (row.status_type === 'realtime') {
      statusBadge = {
        label: 'Terlacak',
        color: 'green',
        confidence: '100%',
      };
    } else if (row.status_type === 'prediksi') {
      statusBadge = {
        label: 'Prediksi',
        color: 'blue',
        confidence: row.probabilitas ? `${row.probabilitas}%` : null,
      };
    }

    // Response gabungan yang komprehensif dan mudah dikonsumsi frontend
    return res.status(200).json({
      success: true,
      data: {
        // Profil
        dosen_id: row.dosen_id,
        nip: row.nip,
        nama: row.nama,
        jabatan: row.jabatan,
        foto: row.foto,
        email: row.email,
        gps_enabled: Boolean(row.gps_enabled),
        prodi: {
          id: row.prodi_id,
          nama: row.nama_prodi,
        },
        jurusan: {
          id: row.jurusan_id,
          nama: row.nama_jurusan,
        },

        // Status terkini & lokasi visual di peta
        status_terkini: {
          status_type: row.status_type,
          badge: statusBadge,
          probabilitas: row.probabilitas !== null ? parseFloat(row.probabilitas) : null,
          last_updated: row.last_updated,
          lokasi_gedung: row.gedung_id
            ? {
                gedung_id: row.gedung_id,
                nama_gedung: row.nama_gedung,
                latitude: row.latitude,
                longitude: row.longitude,
                radius_meter: row.radius_meter,
              }
            : null,
        },

        // Jadwal mengajar
        hari: currentDay,
        jadwal_hari_ini: jadwalHariIni,
        semua_jadwal: semuaJadwal,
        prediksi_hari_ini: prediksiHariIni,
        semua_prediksi: semuaPrediksi,
      },
    });
  } catch (error) {
    console.error('getDetailDosen Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail dan status dosen.',
      error: error.message,
    });
  }
};

module.exports = {
  cariDosen,
  getDetailDosen,
};
