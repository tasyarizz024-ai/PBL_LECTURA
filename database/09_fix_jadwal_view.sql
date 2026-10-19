-- Restore all columns consumed by lecturer and admin schedule endpoints.
USE lectura_db;

CREATE OR REPLACE VIEW v_jadwal_dosen AS
SELECT
  jm.id, jm.dosen_id, d.nama AS nama_dosen, jm.hari, jm.jam_mulai, jm.jam_selesai,
  jm.mata_kuliah, jm.gedung_id, g.nama_gedung, j.campus_id, d.prodi_id
FROM jadwal_mengajar jm
JOIN dosen d ON d.id = jm.dosen_id
JOIN prodi p ON p.id = d.prodi_id
JOIN jurusan j ON j.id = p.jurusan_id
JOIN gedung g ON g.id = jm.gedung_id;
