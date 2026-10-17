const { pool } = require('../config/db');
const { findNearestGedung } = require('../utils/geo');

/**
 * ============================================================================
 * API untuk APLIKASI DOSEN (Android)
 * ============================================================================
 * Semua endpoint di file ini memakai prefix /api/app-dosen dan dilindungi
 * verifyToken + requireRole('dosen'). Token diperoleh dari POST /api/auth/login
 * dengan body { identifier: <email>, password, role: 'dosen' }.
 *
 * Reynolds: user yang login hanya bisa mengirim/melihat datanya sendiri —
 * id dosen selalu diturunkan dari req.user.id (user_id), bukan dari body.
 */

// ── Helper: ambil profil dosen dari user yang sedang login ────────────────
const getDosenByUserId = async (userId) => {
  const [rows] = await pool.query(
    `
    SELECT
      d.id, d.user_id, d.nip, d.nama, d.jabatan, d.foto, d.gps_enabled,
      p.id AS prodi_id, p.nama_prodi,
      j.id AS jurusan_id, j.nama_jurusan
    FROM dosen d
    JOIN prodi p   ON d.prodi_id = p.id
    JOIN jurusan j ON p.jurusan_id = j.id
    WHERE d.user_id = ?
    LIMIT 1
    `,
    [userId]
  );
  return rows[0] || null;
};

/**
 * GET /api/app-dosen/me
 * Profil dosen milik user yang login + status-tracking terkini.
 * Dipanggil sekali setelah login untuk tahu id/NIP/gps_enabled.
 */
const getProfil = async (req, res) => {
  try {
    const dosen = await getDosenByUserId(req.user.id);

    if (!dosen) {
      return res.status(404).json({
        success: false,
        message: 'Akun ini tidak terdaftar sebagai dosen.',
      });
    }

    const [statusRows] = await pool.query(
      `
      SELECT
        cs.status_type,
        cs.gedung_id,
        cs.probabilitas,
        cs.last_updated,
        g.nama_gedung,
        CASE
          WHEN cs.last_updated >= NOW() - INTERVAL 15 MINUTE THEN 'realtime'
          ELSE 'tidak_diketahui'
        END AS status_efektif
      FROM current_status cs
      LEFT JOIN gedung g ON cs.gedung_id = g.id
      WHERE cs.dosen_id = ?
      LIMIT 1
      `,
      [dosen.id]
    );

    const [gedungRows] = await pool.query(
      `
      SELECT
        id, nama_gedung, latitude, longitude, radius_meter
      FROM gedung
      ORDER BY nama_gedung ASC
      `
    );

    return res.status(200).json({
      success: true,
      data: {
        id: dosen.id,
        nip: dosen.nip,
        nama: dosen.nama,
        jabatan: dosen.jabatan,
        foto: dosen.foto,
        email: req.user.email,
        gps_enabled: Boolean(dosen.gps_enabled),
        prodi: { id: dosen.prodi_id, nama: dosen.nama_prodi },
        status_terkini: statusRows[0] || {
          status_type: 'tidak_diketahui',
          gedung_id: null,
          probabilitas: null,
          last_updated: null,
          nama_gedung: null,
          status_efektif: 'tidak_diketahui',
        },
      },
      gedung: gedungRows,
    });
  } catch (error) {
    console.error('appDosen getProfil Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil profil dosen.',
      error: error.message,
    });
  }
};

/**
 * POST /api/app-dosen/lokasi
 * Menerima satu titik lokasi dari aplikasi, lalu:
 *   1. menentukan gedung terdekat via Haversine (geofence radius_meter),
 *   2. menyimpan ke location_logs.
 * current_status TIDAK ditulis di sini — disinkronkan otomatis oleh trigger
 * trg_location_logs_after_insert menjadi 'realtime'.
 *
 * Body: { latitude, longitude, recorded_at? }
 *   recorded_at opsional (ISO-8601) untuk pembaruan antrean offline. Bila diisi,
 *   trigger hanya menandai 'realtime' bila log berjarak < 15 menit dari waktu
 *   server — log yang jauh lebih lama dianggap historis dan diabaikan.
 */
const kirimLokasi = async (req, res) => {
  try {
    const dosen = await getDosenByUserId(req.user.id);
    if (!dosen) {
      return res.status(404).json({
        success: false,
        message: 'Akun ini tidak terdaftar sebagai dosen.',
      });
    }

    // Dosen yang GPS-nya dimatikan admin/dosen sendiri tidak boleh mengirim log
    if (!dosen.gps_enabled) {
      return res.status(403).json({
        success: false,
        message: 'Pelacakan GPS sedang dinonaktifkan, lokasi tidak diterima.',
      });
    }

    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: 'latitude tidak valid (harus antara -90 dan 90).',
      });
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'longitude tidak valid (harus antara -180 dan 180).',
      });
    }

    // Catat waktu server sebagai waktu otoritatif
    const [nowRows] = await pool.query('SELECT NOW() AS now_time');
    const serverTime = nowRows[0].now_time;

    // recorded_at boleh diisi app (untuk antrean offline), tapi tidak boleh
    // lebih dari 15 menit ke depan agar tidak mengaburkan status realtime.
    let recordedAt = serverTime;
    if (req.body.recorded_at) {
      const parsed = new Date(req.body.recorded_at);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'recorded_at tidak valid (gunakan format ISO-8601).',
        });
      }
      if (parsed.getTime() > new Date(serverTime).getTime() + 60 * 1000) {
        return res.status(400).json({
          success: false,
          message: 'recorded_at tidak boleh lebih dari 60 detik di masa depan.',
        });
      }
      recordedAt = parsed;
    }

    // Tentukan gedung terdekat (geofence) di sisi server
    const [gedungRows] = await pool.query(
      'SELECT id, nama_gedung, latitude, longitude, radius_meter FROM gedung'
    );
    const { gedung, jarak_meter } = findNearestGedung(
      gedungRows,
      latitude,
      longitude
    );

    const [result] = await pool.query(
      `
      INSERT INTO location_logs (dosen_id, latitude, longitude, gedung_id, recorded_at)
      VALUES (?, ?, ?, ?, ?)
      `,
      [dosen.id, latitude, longitude, gedung ? gedung.id : null, recordedAt]
    );

    // Ambil status terbaru (trigger sudah memperbarui current_status)
    const [statusRows] = await pool.query(
      `
      SELECT
        cs.status_type, cs.gedung_id, cs.probabilitas, cs.last_updated,
        g.nama_gedung
      FROM current_status cs
      LEFT JOIN gedung g ON cs.gedung_id = g.id
      WHERE cs.dosen_id = ?
      LIMIT 1
      `,
      [dosen.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Lokasi tercatat.',
      data: {
        log_id: result.insertId,
        latitude,
        longitude,
        recorded_at: recordedAt,
        gedung_id: gedung ? gedung.id : null,
        nama_gedung: gedung ? gedung.nama_gedung : null,
        dalam_geofence: Boolean(gedung),
        jarak_meter: jarak_meter === null ? null : Number(jarak_meter.toFixed(1)),
        dalam_radius_gedung: gedung ? Number(gedung.radius_meter) : null,
        server_time: serverTime,
      },
      status_terkini: statusRows[0] || null,
    });
  } catch (error) {
    console.error('appDosen kirimLokasi Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan lokasi.',
      error: error.message,
    });
  }
};

/**
 * POST /api/app-dosen/lokasi/batch
 * Menerima antrean log offline sekaligus (dipakai saat koneksi kembali).
 * Body: { logs: [{ latitude, longitude, recorded_at? }, ...] } (maks. 200)
 * Log yang gagal tidak menghentikan proses; hasil per baris dikembalikan.
 */
const kirimLokasiBatch = async (req, res) => {
  try {
    const dosen = await getDosenByUserId(req.user.id);
    if (!dosen) {
      return res.status(404).json({
        success: false,
        message: 'Akun ini tidak terdaftar sebagai dosen.',
      });
    }

    if (!dosen.gps_enabled) {
      return res.status(403).json({
        success: false,
        message: 'Pelacakan GPS sedang dinonaktifkan, lokasi tidak diterima.',
      });
    }

    const logs = Array.isArray(req.body.logs) ? req.body.logs : null;
    if (!logs || logs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Body harus berisi array logs (minimal 1 item).',
      });
    }
    if (logs.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Maksimal 200 log per permintaan batch.',
      });
    }

    const [gedungRows] = await pool.query(
      'SELECT id, nama_gedung, latitude, longitude, radius_meter FROM gedung'
    );

    let berhasil = 0;
    const gagal = [];

    for (let i = 0; i < logs.length; i += 1) {
      const item = logs[i];
      const baris = i + 1;
      try {
        const latitude = Number(item.latitude);
        const longitude = Number(item.longitude);

        if (
          !Number.isFinite(latitude) ||
          latitude < -90 ||
          latitude > 90 ||
          !Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180
        ) {
          throw new Error('koordinat tidak valid');
        }

        const { gedung } = findNearestGedung(gedungRows, latitude, longitude);

        await pool.query(
          `
          INSERT INTO location_logs (dosen_id, latitude, longitude, gedung_id, recorded_at)
          VALUES (?, ?, ?, ?, COALESCE(?, NOW()))
          `,
          [
            dosen.id,
            latitude,
            longitude,
            gedung ? gedung.id : null,
            item.recorded_at || null,
          ]
        );
        berhasil += 1;
      } catch (err) {
        gagal.push({ baris, alasan: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Antrean lokasi diproses.',
      berhasil,
      gagal_count: gagal.length,
      gagal,
    });
  } catch (error) {
    console.error('appDosen kirimLokasiBatch Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses antrean lokasi.',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/app-dosen/gps
 * Toggle pelacakan GPS oleh dosen sendiri (cermin dari kolom dosen.gps_enabled).
 * Saat dimatikan, aplikasi harus menghentikan foreground service.
 * Body: { gps_enabled: boolean }
 */
const updateGps = async (req, res) => {
  try {
    const dosen = await getDosenByUserId(req.user.id);
    if (!dosen) {
      return res.status(404).json({
        success: false,
        message: 'Akun ini tidak terdaftar sebagai dosen.',
      });
    }

    if (req.body.gps_enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'gps_enabled wajib diisi (true/false).',
      });
    }

    const gpsEnabled = Boolean(req.body.gps_enabled);

    await pool.query('UPDATE dosen SET gps_enabled = ? WHERE id = ?', [
      gpsEnabled ? 1 : 0,
      dosen.id,
    ]);

    // Saat GPS dimatikan, status langsung diturunkan agar mahasiswa tidak melihat
    // melihat dosen sebagai "Terlacak" dengan data basi.
    if (!gpsEnabled) {
      await pool.query(
        `
        INSERT INTO current_status (dosen_id, status_type, gedung_id, probabilitas, last_updated)
        VALUES (?, 'tidak_diketahui', NULL, NULL, NOW())
        ON DUPLICATE KEY UPDATE
          status_type  = 'tidak_diketahui',
          gedung_id    = NULL,
          probabilitas = NULL,
          last_updated = NOW()
        `,
        [dosen.id]
      );
    }

    return res.status(200).json({
      success: true,
      message: gpsEnabled
        ? 'Pelacakan GPS diaktifkan.'
        : 'Pelacakan GPS dinonaktifkan.',
      data: { id: dosen.id, gps_enabled: gpsEnabled },
    });
  } catch (error) {
    console.error('appDosen updateGps Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengubah status pelacakan GPS.',
      error: error.message,
    });
  }
};

/**
 * GET /api/app-dosen/jadwal
 * Jadwal mengajar dosen yang sedang login (read-only).
 * Query params: hari (senin..minggu), scope ('hari_ini' | 'minggu')
 */
const getJadwal = async (req, res) => {
  try {
    const dosen = await getDosenByUserId(req.user.id);
    if (!dosen) {
      return res.status(404).json({
        success: false,
        message: 'Akun ini tidak terdaftar sebagai dosen.',
      });
    }

    const HARI_VALID = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
    let hari = typeof req.query.hari === 'string' ? req.query.hari.trim().toLowerCase() : '';
    if (hari && !HARI_VALID.includes(hari)) {
      return res.status(400).json({
        success: false,
        message: `hari tidak valid. Gunakan salah satu dari: ${HARI_VALID.join(', ')}.`,
      });
    }
    if (!hari) {
      const [dayRows] = await pool.query(
        `SELECT ELT(WEEKDAY(CURDATE()) + 1, 'senin','selasa','rabu','kamis','jumat','sabtu','minggu') AS hari`
      );
      hari = dayRows[0].hari;
    }

    const [rows] = await pool.query(
      `
      SELECT
        id, hari, jam_mulai, jam_selesai, mata_kuliah,
        gedung_id, nama_gedung
      FROM v_jadwal_dosen
      WHERE dosen_id = ? AND hari = ?
      ORDER BY jam_mulai ASC
      `,
      [dosen.id, hari]
    );

    const [semuaRows] = await pool.query(
      `
      SELECT
        id, hari, jam_mulai, jam_selesai, mata_kuliah,
        gedung_id, nama_gedung
      FROM v_jadwal_dosen
      WHERE dosen_id = ?
      ORDER BY FIELD(hari, 'senin','selasa','rabu','kamis','jumat','sabtu','minggu'), jam_mulai ASC
      `,
      [dosen.id]
    );

    return res.status(200).json({
      success: true,
      hari,
      data: rows,
      semua_jadwal: semuaRows,
    });
  } catch (error) {
    console.error('appDosen getJadwal Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil jadwal mengajar.',
      error: error.message,
    });
  }
};

/**
 * GET /api/app-dosen/lokasi/riwayat
 * Log lokasi milik dosen yang sedang login (view v_log_aktivitas).
 * Query params: limit (default 50, max 200), page (default 1)
 */
const getRiwayat = async (req, res) => {
  try {
    const dosen = await getDosenByUserId(req.user.id);
    if (!dosen) {
      return res.status(404).json({
        success: false,
        message: 'Akun ini tidak terdaftar sebagai dosen.',
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const [[countRow]] = await pool.query(
      'SELECT COUNT(*) AS total FROM v_log_aktivitas WHERE dosen_id = ?',
      [dosen.id]
    );
    const totalRecords = countRow.total;

    const [rows] = await pool.query(
      `
      SELECT
        id AS log_id,
        latitude,
        longitude,
        gedung_id,
        nama_gedung,
        recorded_at AS waktu_log,
        CASE
          WHEN recorded_at >= NOW() - INTERVAL 15 MINUTE THEN 'realtime'
          ELSE 'tidak_diketahui'
        END AS status_type
      FROM v_log_aktivitas
      WHERE dosen_id = ?
      ORDER BY recorded_at DESC, id DESC
      LIMIT ? OFFSET ?
      `,
      [dosen.id, limit, offset]
    );

    return res.status(200).json({
      success: true,
      pagination: {
        total_records: totalRecords,
        total_pages: Math.ceil(totalRecords / limit) || 1,
        current_page: page,
        per_page: limit,
      },
      data: rows,
    });
  } catch (error) {
    console.error('appDosen getRiwayat Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat lokasi.',
      error: error.message,
    });
  }
};

module.exports = {
  getProfil,
  kirimLokasi,
  kirimLokasiBatch,
  updateGps,
  getJadwal,
  getRiwayat,
};