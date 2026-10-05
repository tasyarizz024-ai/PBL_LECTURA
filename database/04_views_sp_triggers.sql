-- =====================================================================
-- LECTURA — Views, Stored Procedures, Triggers
-- Jalankan setelah 01_ddl_lectura.sql (dan 02_dummy_data.sql jika ingin
-- langsung mencoba dengan data contoh)
-- =====================================================================

USE lectura_db;

-- =====================================================================
-- VIEWS
-- =====================================================================

-- ---------------------------------------------------------------------
-- v_pencarian_dosen
-- Dipakai langsung oleh halaman "Dashboard Cari Dosen" (Mahasiswa).
-- Menggabungkan dosen + prodi/jurusan + status terkini + nama gedung.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_pencarian_dosen AS
SELECT
  d.id            AS dosen_id,
  d.nip,
  d.nama,
  d.jabatan,
  d.foto,
  p.id            AS prodi_id,
  p.nama_prodi,
  j.id            AS jurusan_id,
  j.nama_jurusan,
  COALESCE(cs.status_type, 'tidak_diketahui') AS status_type,
  g.id            AS gedung_id,
  g.nama_gedung,
  cs.probabilitas,
  cs.last_updated
FROM dosen d
JOIN prodi p          ON p.id = d.prodi_id
JOIN jurusan j         ON j.id = p.jurusan_id
LEFT JOIN current_status cs ON cs.dosen_id = d.id
LEFT JOIN gedung g          ON g.id = cs.gedung_id;

-- ---------------------------------------------------------------------
-- v_jadwal_dosen
-- Dipakai halaman "Detail & Status Dosen" untuk menampilkan jadwal
-- mengajar lengkap dengan nama gedung.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_jadwal_dosen AS
SELECT
  jm.dosen_id,
  d.nama AS nama_dosen,
  jm.hari,
  jm.jam_mulai,
  jm.jam_selesai,
  jm.mata_kuliah,
  g.nama_gedung
FROM jadwal_mengajar jm
JOIN dosen d  ON d.id = jm.dosen_id
JOIN gedung g ON g.id = jm.gedung_id;

-- ---------------------------------------------------------------------
-- v_log_aktivitas
-- Dipakai halaman Admin "Log Aktivitas Lokasi".
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_log_aktivitas AS
SELECT
  ll.id,
  ll.dosen_id,
  d.nip,
  d.nama AS nama_dosen,
  ll.gedung_id,
  g.nama_gedung,
  ll.latitude,
  ll.longitude,
  ll.recorded_at
FROM location_logs ll
JOIN dosen d       ON d.id = ll.dosen_id
LEFT JOIN gedung g ON g.id = ll.gedung_id;


-- =====================================================================
-- TRIGGERS
-- =====================================================================

DELIMITER $$

-- ---------------------------------------------------------------------
-- trg_location_logs_after_insert
-- Setiap ada log GPS baru masuk, current_status dosen tsb otomatis
-- disinkronkan jadi 'realtime' — sesuai catatan desain bahwa
-- current_status adalah cache yang harus selalu up to date tanpa
-- backend perlu menulis ke 2 tabel secara manual.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_location_logs_after_insert
AFTER INSERT ON location_logs
FOR EACH ROW
BEGIN
  INSERT INTO current_status (dosen_id, status_type, gedung_id, probabilitas, last_updated)
  VALUES (NEW.dosen_id, 'realtime', NEW.gedung_id, NULL, NEW.recorded_at)
  ON DUPLICATE KEY UPDATE
    status_type  = 'realtime',
    gedung_id    = NEW.gedung_id,
    probabilitas = NULL,
    last_updated = NEW.recorded_at;
END$$

-- ---------------------------------------------------------------------
-- trg_jadwal_mengajar_before_insert
-- Validasi jam_selesai harus setelah jam_mulai sebelum data disimpan.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_jadwal_mengajar_before_insert
BEFORE INSERT ON jadwal_mengajar
FOR EACH ROW
BEGIN
  IF NEW.jam_selesai <= NEW.jam_mulai THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'jam_selesai harus lebih besar dari jam_mulai';
  END IF;
END$$

DELIMITER ;


-- =====================================================================
-- STORED PROCEDURES
-- =====================================================================

DELIMITER $$

-- ---------------------------------------------------------------------
-- sp_tambah_dosen
-- Insert user + profil dosen sekaligus dalam satu transaksi, supaya
-- tidak ada kondisi user "yatim" (user dibuat tapi dosen gagal, atau
-- sebaliknya) kalau salah satu insert gagal di tengah jalan.
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_tambah_dosen (
  IN p_email     VARCHAR(100),
  IN p_password  VARCHAR(255),
  IN p_prodi_id  INT UNSIGNED,
  IN p_nip       VARCHAR(20),
  IN p_nama      VARCHAR(100),
  IN p_jabatan   VARCHAR(50)
)
BEGIN
  DECLARE v_user_id INT UNSIGNED;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  INSERT INTO users (email, password, role) VALUES (p_email, p_password, 'dosen');
  SET v_user_id = LAST_INSERT_ID();

  INSERT INTO dosen (user_id, prodi_id, nip, nama, jabatan, gps_enabled)
  VALUES (v_user_id, p_prodi_id, p_nip, p_nama, p_jabatan, TRUE);

  COMMIT;
END$$

-- ---------------------------------------------------------------------
-- sp_refresh_prediksi
-- Simulasi job cron per-dosen: dijalankan berkala oleh backend untuk
-- setiap dosen yang GPS-nya tidak terlihat aktif dalam 15 menit
-- terakhir. Mengambil slot habit_summary dengan probabilitas
-- tertinggi yang cocok dengan hari & jam saat ini, lalu memperbarui
-- current_status. Kalau tidak ada log GPS baru DAN tidak ada histori
-- yang cocok, status jadi 'tidak_diketahui'.
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_refresh_prediksi (
  IN p_dosen_id INT UNSIGNED
)
BEGIN
  DECLARE v_hari        VARCHAR(10);
  DECLARE v_now_time    TIME;
  DECLARE v_last_log    TIMESTAMP;
  DECLARE v_gedung_id   INT UNSIGNED;
  DECLARE v_prob        DECIMAL(5,2);

  SET v_now_time = CURTIME();
  SET v_hari = ELT(WEEKDAY(CURDATE()) + 1,
                    'senin','selasa','rabu','kamis','jumat','sabtu','minggu');

  SELECT MAX(recorded_at) INTO v_last_log
  FROM location_logs
  WHERE dosen_id = p_dosen_id;

  IF v_last_log IS NOT NULL AND v_last_log >= NOW() - INTERVAL 15 MINUTE THEN
    -- Masih realtime (trigger sudah menjaga current_status), tidak perlu diubah.
    SELECT 'realtime - tidak diubah' AS hasil;
  ELSE
    SELECT gedung_id, probabilitas INTO v_gedung_id, v_prob
    FROM habit_summary
    WHERE dosen_id = p_dosen_id
      AND hari = v_hari
      AND v_now_time BETWEEN jam_mulai AND jam_selesai
    ORDER BY probabilitas DESC
    LIMIT 1;

    IF v_gedung_id IS NOT NULL THEN
      INSERT INTO current_status (dosen_id, status_type, gedung_id, probabilitas, last_updated)
      VALUES (p_dosen_id, 'prediksi', v_gedung_id, v_prob, NOW())
      ON DUPLICATE KEY UPDATE
        status_type  = 'prediksi',
        gedung_id    = v_gedung_id,
        probabilitas = v_prob,
        last_updated = NOW();
      SELECT 'prediksi - diperbarui' AS hasil;
    ELSE
      INSERT INTO current_status (dosen_id, status_type, gedung_id, probabilitas, last_updated)
      VALUES (p_dosen_id, 'tidak_diketahui', NULL, NULL, NOW())
      ON DUPLICATE KEY UPDATE
        status_type  = 'tidak_diketahui',
        gedung_id    = NULL,
        probabilitas = NULL,
        last_updated = NOW();
      SELECT 'tidak_diketahui - tidak ada histori cocok' AS hasil;
    END IF;
  END IF;
END$$

DELIMITER ;
