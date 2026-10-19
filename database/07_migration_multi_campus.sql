-- Multi-campus tenant and administrator hierarchy.
-- Backfills all existing rows into one campus before enabling new roles.
USE lectura_db;

CREATE TABLE IF NOT EXISTS campuses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(150) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO campuses (nama, slug)
SELECT 'Kampus Utama', 'kampus-utama'
WHERE NOT EXISTS (SELECT 1 FROM campuses WHERE slug = 'kampus-utama');

ALTER TABLE users
  MODIFY role ENUM('admin','superadmin','admin_kampus','admin_prodi','dosen','mahasiswa') NOT NULL,
  ADD COLUMN campus_id INT UNSIGNED NULL,
  ADD COLUMN display_name VARCHAR(100) NULL,
  ADD COLUMN managed_jurusan_id INT UNSIGNED NULL,
  ADD COLUMN managed_prodi_id INT UNSIGNED NULL;

UPDATE users
SET campus_id = (SELECT id FROM campuses WHERE slug = 'kampus-utama')
WHERE role IN ('admin', 'dosen', 'mahasiswa');

UPDATE users SET role = 'admin_kampus' WHERE role = 'admin';

ALTER TABLE users
  MODIFY role ENUM('superadmin','admin_kampus','admin_prodi','dosen','mahasiswa') NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT fk_users_campus
    FOREIGN KEY (campus_id) REFERENCES campuses(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT fk_users_managed_jurusan
    FOREIGN KEY (managed_jurusan_id) REFERENCES jurusan(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT fk_users_managed_prodi
    FOREIGN KEY (managed_prodi_id) REFERENCES prodi(id)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE jurusan
  ADD COLUMN campus_id INT UNSIGNED NULL;

UPDATE jurusan
SET campus_id = (SELECT id FROM campuses WHERE slug = 'kampus-utama')
WHERE campus_id IS NULL;

ALTER TABLE jurusan
  MODIFY campus_id INT UNSIGNED NOT NULL;

-- Older installations may have either the original index name or the name
-- introduced by migration 06. Remove whichever global uniqueness indexes exist.
SET @drop_jurusan_nama_index = IF(
  EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'jurusan'
      AND index_name = 'nama_jurusan'
  ),
  'ALTER TABLE jurusan DROP INDEX nama_jurusan',
  'SELECT 1'
);
PREPARE drop_jurusan_nama_index FROM @drop_jurusan_nama_index;
EXECUTE drop_jurusan_nama_index;
DEALLOCATE PREPARE drop_jurusan_nama_index;

SET @drop_uq_jurusan_nama_index = IF(
  EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'jurusan'
      AND index_name = 'uq_jurusan_nama'
  ),
  'ALTER TABLE jurusan DROP INDEX uq_jurusan_nama',
  'SELECT 1'
);
PREPARE drop_uq_jurusan_nama_index FROM @drop_uq_jurusan_nama_index;
EXECUTE drop_uq_jurusan_nama_index;
DEALLOCATE PREPARE drop_uq_jurusan_nama_index;

ALTER TABLE jurusan
  ADD CONSTRAINT fk_jurusan_campus
    FOREIGN KEY (campus_id) REFERENCES campuses(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD UNIQUE KEY uq_jurusan_campus_name (campus_id, nama_jurusan);

ALTER TABLE gedung
  ADD COLUMN campus_id INT UNSIGNED NULL;

UPDATE gedung
SET campus_id = (SELECT id FROM campuses WHERE slug = 'kampus-utama')
WHERE campus_id IS NULL;

ALTER TABLE gedung
  MODIFY campus_id INT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_gedung_campus
    FOREIGN KEY (campus_id) REFERENCES campuses(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD INDEX idx_gedung_campus (campus_id);

ALTER TABLE mahasiswa
  ADD COLUMN prodi_id INT UNSIGNED NULL;

UPDATE mahasiswa m
JOIN prodi p ON p.nama_prodi = m.prodi
JOIN jurusan j ON j.id = p.jurusan_id
SET m.prodi_id = p.id
WHERE j.campus_id = (SELECT id FROM campuses WHERE slug = 'kampus-utama');

ALTER TABLE mahasiswa
  ADD CONSTRAINT fk_mahasiswa_prodi
    FOREIGN KEY (prodi_id) REFERENCES prodi(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  ADD INDEX idx_mahasiswa_prodi (prodi_id);

-- Include the campus in all read models used by API queries and data export.
CREATE OR REPLACE VIEW v_pencarian_dosen AS
SELECT
  d.id AS dosen_id, d.nip, d.nama, d.jabatan, d.foto,
  p.id AS prodi_id, p.nama_prodi, j.id AS jurusan_id, j.nama_jurusan,
  j.campus_id,
  COALESCE(cs.status_type, 'tidak_diketahui') AS status_type,
  g.id AS gedung_id, g.nama_gedung, cs.probabilitas, cs.last_updated
FROM dosen d
JOIN prodi p ON p.id = d.prodi_id
JOIN jurusan j ON j.id = p.jurusan_id
LEFT JOIN current_status cs ON cs.dosen_id = d.id
LEFT JOIN gedung g ON g.id = cs.gedung_id;

CREATE OR REPLACE VIEW v_jadwal_dosen AS
SELECT
  jm.id, jm.dosen_id, d.nama AS nama_dosen, jm.hari, jm.jam_mulai, jm.jam_selesai,
  jm.mata_kuliah, jm.gedung_id, g.nama_gedung, j.campus_id, d.prodi_id
FROM jadwal_mengajar jm
JOIN dosen d ON d.id = jm.dosen_id
JOIN prodi p ON p.id = d.prodi_id
JOIN jurusan j ON j.id = p.jurusan_id
JOIN gedung g ON g.id = jm.gedung_id;

CREATE OR REPLACE VIEW v_log_aktivitas AS
SELECT
  ll.id, ll.dosen_id, d.nip, d.nama AS nama_dosen,
  ll.gedung_id, g.nama_gedung, ll.latitude, ll.longitude, ll.recorded_at,
  j.campus_id, d.prodi_id
FROM location_logs ll
JOIN dosen d ON d.id = ll.dosen_id
JOIN prodi p ON p.id = d.prodi_id
JOIN jurusan j ON j.id = p.jurusan_id
LEFT JOIN gedung g ON g.id = ll.gedung_id;

-- Existing admin accounts become administrators of the backfilled campus.
-- Create the first platform superadmin through the private bootstrap command.

DROP PROCEDURE IF EXISTS sp_tambah_dosen;

DELIMITER $$

CREATE PROCEDURE sp_tambah_dosen (
  IN p_email     VARCHAR(100),
  IN p_password  VARCHAR(255),
  IN p_prodi_id  INT UNSIGNED,
  IN p_campus_id INT UNSIGNED,
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

  INSERT INTO users (email, password, role, campus_id, display_name)
  VALUES (p_email, p_password, 'dosen', p_campus_id, p_nama);
  SET v_user_id = LAST_INSERT_ID();

  INSERT INTO dosen (user_id, prodi_id, nip, nama, jabatan, gps_enabled)
  VALUES (v_user_id, p_prodi_id, p_nip, p_nama, p_jabatan, FALSE);

  COMMIT;
END$$

DELIMITER ;
