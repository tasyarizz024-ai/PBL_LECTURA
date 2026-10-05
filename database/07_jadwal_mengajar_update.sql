-- 07_jadwal_mengajar_update.sql
-- Reset jadwal_mengajar: hapus data lama (gedung dummy), isi jadwal baru
-- untuk 5 dosen, Senin-Jumat, min 4 sesi/minggu/dosen, tanpa bentrok
-- (jeda >= 1 jam antar sesi di hari yang sama), jam 08:00-16:00.

USE lectura_db;

DELETE FROM jadwal_mengajar;

INSERT INTO jadwal_mengajar (dosen_id, hari, jam_mulai, jam_selesai, mata_kuliah, gedung_id) VALUES
-- Dosen 1: Reza Pratama, S.Kom., M.T.
(1, 'senin', '08:00:00', '10:00:00', 'Basis Data II', 1),
(1, 'senin', '13:00:00', '15:00:00', 'Praktikum Basis Data', 2),
(1, 'rabu',  '08:00:00', '10:00:00', 'Basis Data II', 3),
(1, 'rabu',  '13:00:00', '15:00:00', 'Sistem Informasi', 5),
(1, 'jumat', '10:00:00', '12:00:00', 'Seminar Proposal', 6),

-- Dosen 2: Siti Aminah, S.Kom., M.Kom.
(2, 'selasa', '08:00:00', '10:00:00', 'Pemrograman Web', 2),
(2, 'selasa', '13:00:00', '15:00:00', 'Praktikum Pemrograman Web', 1),
(2, 'kamis',  '09:00:00', '11:00:00', 'Basis Data Lanjut', 3),
(2, 'jumat',  '08:00:00', '10:00:00', 'Rekayasa Perangkat Lunak', 5),
(2, 'jumat',  '13:00:00', '15:00:00', 'Pemrograman Web', 6),

-- Dosen 3: Budi Santoso, S.T., M.T.
(3, 'senin', '10:00:00', '12:00:00', 'Struktur Data', 3),
(3, 'rabu',  '09:00:00', '11:00:00', 'Struktur Data', 1),
(3, 'rabu',  '14:00:00', '16:00:00', 'Algoritma dan Pemrograman', 2),
(3, 'kamis', '10:00:00', '12:00:00', 'Praktikum Struktur Data', 6),
(3, 'jumat', '08:00:00', '10:00:00', 'Kalkulus Numerik', 5),

-- Dosen 4: Dewi Lestari, S.T., M.Eng.
(4, 'senin', '13:00:00', '15:00:00', 'Jaringan Komputer', 2),
(4, 'selasa','10:00:00', '12:00:00', 'Jaringan Komputer', 1),
(4, 'kamis', '08:00:00', '10:00:00', 'Protokol Jaringan', 3),
(4, 'kamis', '13:00:00', '15:00:00', 'Praktikum Jaringan', 6),
(4, 'jumat', '10:00:00', '12:00:00', 'Keamanan Jaringan', 5),

-- Dosen 5: Andi Wijaya, S.P., M.Si.
(5, 'selasa','08:00:00', '10:00:00', 'Mekanika Fluida', 1),
(5, 'rabu',  '11:00:00', '13:00:00', 'Termodinamika', 2),
(5, 'kamis', '09:00:00', '11:00:00', 'Mekanika Fluida', 3),
(5, 'jumat', '08:00:00', '10:00:00', 'Hidrolika', 6),
(5, 'jumat', '13:00:00', '15:00:00', 'Praktikum Mekanika', 5);
