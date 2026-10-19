-- Add a lecturer-controlled availability status, separate from GPS consent.
USE lectura_db;

ALTER TABLE dosen
  ADD COLUMN status_ketersediaan ENUM('tersedia','tidak_tersedia')
    NOT NULL DEFAULT 'tidak_tersedia',
  ADD COLUMN ketersediaan_sampai DATETIME NULL;

CREATE OR REPLACE VIEW v_pencarian_dosen AS
SELECT
  d.id AS dosen_id, d.nip, d.nama, d.jabatan, d.foto,
  d.status_ketersediaan, d.ketersediaan_sampai,
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
