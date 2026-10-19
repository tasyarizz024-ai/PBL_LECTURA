-- =====================================================================
-- LECTURA — Data Dummy (untuk keperluan tampilan & testing)
-- Jalankan setelah 01_ddl_lectura.sql
-- =====================================================================

USE lectura_db;

-- ---------------------------------------------------------------------
-- jurusan & prodi
-- ---------------------------------------------------------------------
INSERT INTO jurusan (nama_jurusan) VALUES
  ('Teknologi Informasi'),
  ('Teknik Pertanian');

INSERT INTO prodi (jurusan_id, nama_prodi) VALUES
  (1, 'Manajemen Informatika'),
  (1, 'Teknik Komputer'),
  (2, 'Teknik Mesin Pertanian');

-- ---------------------------------------------------------------------
-- gedung
-- ---------------------------------------------------------------------
INSERT INTO gedung (nama_gedung, latitude, longitude, radius_meter) VALUES
  ('Gedung Serba Guna (GSB)', -5.1350000, 105.2985000, 60),
  ('Lab Software', -5.1355000, 105.2990000, 40),
  ('Ruang Dosen TI', -5.1348000, 105.2982000, 50);

-- ---------------------------------------------------------------------
-- users + dosen (5 dosen, password default: 'dosen123')
-- ---------------------------------------------------------------------
INSERT INTO users (email, password, role) VALUES
  ('reza@polinela.ac.id', '$2b$10$t/hqGBRBCQhOlfCY8GFvw.oFpDgTpuMNEjs5pRiPEwFRr01ELiOQe', 'dosen'),
  ('siti@polinela.ac.id', '$2b$10$t/hqGBRBCQhOlfCY8GFvw.oFpDgTpuMNEjs5pRiPEwFRr01ELiOQe', 'dosen'),
  ('budi@polinela.ac.id', '$2b$10$t/hqGBRBCQhOlfCY8GFvw.oFpDgTpuMNEjs5pRiPEwFRr01ELiOQe', 'dosen'),
  ('dewi@polinela.ac.id', '$2b$10$t/hqGBRBCQhOlfCY8GFvw.oFpDgTpuMNEjs5pRiPEwFRr01ELiOQe', 'dosen'),
  ('andi@polinela.ac.id', '$2b$10$t/hqGBRBCQhOlfCY8GFvw.oFpDgTpuMNEjs5pRiPEwFRr01ELiOQe', 'dosen');


INSERT INTO dosen (user_id, prodi_id, nip, nama, jabatan, foto, gps_enabled) VALUES
  (1, 1, '198501012010011001', 'Reza Pratama, S.Kom., M.T.', 'Lektor', NULL, TRUE),
  (2, 1, '198602022011012002', 'Siti Aminah, S.Kom., M.Kom.', 'Asisten Ahli', NULL, TRUE),
  (3, 2, '198703032012011003', 'Budi Santoso, S.T., M.T.', 'Lektor Kepala', NULL, TRUE),
  (4, 2, '198804042013012004', 'Dewi Lestari, S.T., M.Eng.', 'Lektor', NULL, FALSE),
  (5, 3, '198905052014011005', 'Andi Wijaya, S.P., M.Si.', 'Asisten Ahli', NULL, TRUE);

-- ---------------------------------------------------------------------
-- contoh akun mahasiswa & admin (password default: 'password123' untuk mhs, 'admin123' untuk admin)
-- ---------------------------------------------------------------------
INSERT INTO users (email, password, role) VALUES
  ('tasya@polinela.ac.id', '$2b$10$cxCUgaG6xy1jMywUiEHIlOJYTVdj68KWh23VQcAq8Hha1HtBlZkMO', 'mahasiswa'),
  ('admin@polinela.ac.id', '$2b$10$3i7Y5x.9Je/jCJ41QMQtxOK.SpKa3lOj.l8gZlYztTuKSSAaIbZ36', 'admin');

INSERT INTO mahasiswa (user_id, nim, nama, prodi) VALUES
  (6, '2231001', 'Tasya', 'Manajemen Informatika');

-- ---------------------------------------------------------------------
-- location_logs (contoh log GPS terbaru per dosen)
-- ---------------------------------------------------------------------
INSERT INTO location_logs (dosen_id, latitude, longitude, gedung_id, recorded_at) VALUES
  (1, -5.1355000, 105.2990000, 2, NOW() - INTERVAL 3 MINUTE),
  (2, -5.1348000, 105.2982000, 3, NOW() - INTERVAL 10 MINUTE),
  (3, -5.1350000, 105.2985000, 1, NOW() - INTERVAL 1 MINUTE);
  -- dosen 4 & 5 sengaja tidak punya log terbaru (simulasi GPS nonaktif)

-- ---------------------------------------------------------------------
-- habit_summary (contoh hasil olahan histori 7 hari)
-- ---------------------------------------------------------------------
INSERT INTO habit_summary (dosen_id, hari, jam_mulai, jam_selesai, gedung_id, probabilitas) VALUES
  (4, 'senin', '09:00:00', '11:00:00', 2, 80.00),
  (4, 'rabu',  '13:00:00', '15:00:00', 3, 65.00),
  (5, 'selasa','08:00:00', '10:00:00', 1, 72.50);

-- ---------------------------------------------------------------------
-- current_status (cache status terkini per dosen)
-- ---------------------------------------------------------------------
INSERT INTO current_status (dosen_id, status_type, gedung_id, probabilitas, last_updated) VALUES
  (1, 'realtime', 2, NULL, NOW() - INTERVAL 3 MINUTE),
  (2, 'realtime', 3, NULL, NOW() - INTERVAL 10 MINUTE),
  (3, 'realtime', 1, NULL, NOW() - INTERVAL 1 MINUTE),
  (4, 'prediksi', 2, 80.00, NOW()),
  (5, 'tidak_diketahui', NULL, NULL, NOW());

-- ---------------------------------------------------------------------
-- jadwal_mengajar (contoh jadwal resmi, dipakai untuk konteks & prediksi)
-- ---------------------------------------------------------------------
INSERT INTO jadwal_mengajar (dosen_id, hari, jam_mulai, jam_selesai, mata_kuliah, gedung_id) VALUES
  (1, 'senin', '08:00:00', '10:00:00', 'Basis Data II', 2),
  (2, 'selasa', '10:00:00', '12:00:00', 'Pemrograman Web', 3),
  (3, 'rabu', '13:00:00', '15:00:00', 'Struktur Data', 1),
  (4, 'senin', '09:00:00', '11:00:00', 'Jaringan Komputer', 2),
  (5, 'selasa', '08:00:00', '10:00:00', 'Mekanika Fluida', 1);
