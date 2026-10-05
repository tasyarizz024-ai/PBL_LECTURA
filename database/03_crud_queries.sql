-- =====================================================================
-- LECTURA — Query CRUD (contoh untuk tiap tabel/fitur utama)
-- =====================================================================

USE lectura_db;

-- =====================================================================
-- 1. DOSEN (Admin — Manajemen Dosen)
-- =====================================================================

-- CREATE: tambah dosen baru
INSERT INTO users (email, password, role) VALUES ('contoh@polinela.ac.id', '$2y$10$hashcontoh', 'dosen');
INSERT INTO dosen (user_id, prodi_id, nip, nama, jabatan, foto, gps_enabled)
VALUES (LAST_INSERT_ID(), 1, '199001012015011099', 'Contoh Dosen, S.Kom., M.T.', 'Asisten Ahli', NULL, TRUE);

-- READ: daftar dosen + prodi + jurusan (untuk tabel admin)
SELECT d.id, d.nip, d.nama, d.jabatan, p.nama_prodi, j.nama_jurusan, d.gps_enabled
FROM dosen d
JOIN prodi p   ON d.prodi_id = p.id
JOIN jurusan j ON p.jurusan_id = j.id
ORDER BY d.nama;

-- READ: cari dosen by nama/NIP (fitur pencarian mahasiswa)
SELECT id, nip, nama, jabatan, foto
FROM dosen
WHERE nama LIKE CONCAT('%', 'reza', '%')
   OR nip LIKE CONCAT('%', 'reza', '%');

-- READ: filter dosen by prodi
SELECT d.id, d.nama, d.jabatan
FROM dosen d
WHERE d.prodi_id = 1;

-- UPDATE: ubah data dosen
UPDATE dosen
SET jabatan = 'Lektor Kepala', gps_enabled = FALSE
WHERE id = 1;

-- DELETE: hapus dosen (otomatis hapus user terkait karena ON DELETE CASCADE dari sisi dosen->user_id tidak cascade balik;
-- hapus users akan cascade ke dosen, bukan sebaliknya — jadi hapus lewat users)
DELETE FROM users WHERE id = (SELECT user_id FROM dosen WHERE id = 1);


-- =====================================================================
-- 2. GEDUNG & GEOFENCE (Admin — Manajemen Gedung)
-- =====================================================================

-- CREATE
INSERT INTO gedung (nama_gedung, latitude, longitude, radius_meter)
VALUES ('Gedung Baru', -5.1360000, 105.2995000, 45);

-- READ: semua gedung
SELECT * FROM gedung ORDER BY nama_gedung;

-- UPDATE: ubah radius geofence
UPDATE gedung SET radius_meter = 55 WHERE id = 1;

-- DELETE
DELETE FROM gedung WHERE id = 4;


-- =====================================================================
-- 3. STATUS DOSEN (Mahasiswa — Dashboard Cari Dosen & Detail Dosen)
-- =====================================================================

-- READ: status terkini semua dosen (untuk grid pencarian)
SELECT
  d.id, d.nama, d.foto,
  cs.status_type,
  g.nama_gedung,
  cs.probabilitas,
  cs.last_updated
FROM dosen d
LEFT JOIN current_status cs ON cs.dosen_id = d.id
LEFT JOIN gedung g          ON g.id = cs.gedung_id
ORDER BY d.nama;

-- READ: detail status + jadwal hari ini untuk satu dosen
SELECT
  d.nama, d.nip, d.jabatan,
  cs.status_type, g.nama_gedung, cs.probabilitas, cs.last_updated
FROM dosen d
LEFT JOIN current_status cs ON cs.dosen_id = d.id
LEFT JOIN gedung g          ON g.id = cs.gedung_id
WHERE d.id = 2;

SELECT jm.hari, jm.jam_mulai, jm.jam_selesai, jm.mata_kuliah, g.nama_gedung
FROM jadwal_mengajar jm
JOIN gedung g ON g.id = jm.gedung_id
WHERE jm.dosen_id = 2 AND jm.hari = 'selasa'
ORDER BY jm.jam_mulai;


-- =====================================================================
-- 4. LOCATION_LOGS (diterima dari app Android dosen)
-- =====================================================================

-- CREATE: insert log GPS baru
INSERT INTO location_logs (dosen_id, latitude, longitude, gedung_id, recorded_at)
VALUES (2, -5.1348000, 105.2982000, 3, NOW());

-- READ: log lokasi terbaru per dosen (untuk update current_status)
SELECT *
FROM location_logs
WHERE dosen_id = 2
ORDER BY recorded_at DESC
LIMIT 1;

-- READ: riwayat log (Admin — Log Aktivitas Lokasi), filter tanggal & dosen
SELECT ll.recorded_at, d.nama, g.nama_gedung, ll.latitude, ll.longitude
FROM location_logs ll
JOIN dosen d          ON d.id = ll.dosen_id
LEFT JOIN gedung g    ON g.id = ll.gedung_id
WHERE ll.dosen_id = 2
  AND DATE(ll.recorded_at) = CURDATE()
ORDER BY ll.recorded_at DESC;

-- DELETE: retensi data lama (hapus log lebih dari 30 hari)
DELETE FROM location_logs
WHERE recorded_at < NOW() - INTERVAL 30 DAY;


-- =====================================================================
-- 5. HABIT_SUMMARY (hasil agregasi, untuk fitur prediksi)
-- =====================================================================

-- CREATE/UPDATE (upsert) hasil perhitungan cron
INSERT INTO habit_summary (dosen_id, hari, jam_mulai, jam_selesai, gedung_id, probabilitas)
VALUES (4, 'senin', '09:00:00', '11:00:00', 2, 82.00)
ON DUPLICATE KEY UPDATE
  probabilitas = VALUES(probabilitas),
  gedung_id    = VALUES(gedung_id);

-- READ: prediksi lokasi dosen pada hari & jam tertentu
SELECT hs.gedung_id, g.nama_gedung, hs.probabilitas
FROM habit_summary hs
JOIN gedung g ON g.id = hs.gedung_id
WHERE hs.dosen_id = 4
  AND hs.hari = 'senin'
  AND '10:00:00' BETWEEN hs.jam_mulai AND hs.jam_selesai
ORDER BY hs.probabilitas DESC
LIMIT 1;


-- =====================================================================
-- 6. CURRENT_STATUS (update status real-time / prediksi)
-- =====================================================================

-- UPSERT: set status real-time ketika GPS dosen aktif
INSERT INTO current_status (dosen_id, status_type, gedung_id, probabilitas, last_updated)
VALUES (2, 'realtime', 3, NULL, NOW())
ON DUPLICATE KEY UPDATE
  status_type  = VALUES(status_type),
  gedung_id    = VALUES(gedung_id),
  probabilitas = VALUES(probabilitas),
  last_updated = VALUES(last_updated);

-- UPSERT: set status prediksi ketika GPS dosen mati (dari habit_summary)
INSERT INTO current_status (dosen_id, status_type, gedung_id, probabilitas, last_updated)
VALUES (4, 'prediksi', 2, 82.00, NOW())
ON DUPLICATE KEY UPDATE
  status_type  = VALUES(status_type),
  gedung_id    = VALUES(gedung_id),
  probabilitas = VALUES(probabilitas),
  last_updated = VALUES(last_updated);


-- =====================================================================
-- 7. JURUSAN & PRODI (Admin — data master pendukung filter)
-- =====================================================================

-- READ: daftar prodi per jurusan (untuk dropdown filter)
SELECT p.id, p.nama_prodi, j.nama_jurusan
FROM prodi p
JOIN jurusan j ON j.id = p.jurusan_id
ORDER BY j.nama_jurusan, p.nama_prodi;

-- CREATE prodi baru
INSERT INTO prodi (jurusan_id, nama_prodi) VALUES (1, 'Sistem Informasi');
