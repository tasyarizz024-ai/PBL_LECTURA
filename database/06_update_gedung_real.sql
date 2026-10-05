-- 06_update_gedung_real.sql
-- Mengganti data gedung dummy dengan koordinat asli kampus Polinela.
-- UPDATE untuk 3 baris lama (menjaga relasi FK ke location_logs/jadwal_mengajar),
-- INSERT untuk 2 gedung baru (GKB, SFS).

USE lectura_db;

-- 1. Update 3 gedung yang sudah ada (urut by id)
UPDATE gedung SET nama_gedung = 'GSG',    latitude = -5.356974, longitude = 105.232167 WHERE id = 1;
UPDATE gedung SET nama_gedung = 'Sakura', latitude = -5.356341, longitude = 105.232370 WHERE id = 2;
UPDATE gedung SET nama_gedung = 'PPA',    latitude = -5.356097, longitude = 105.231405 WHERE id = 3;

-- 2. Insert 2 gedung baru
INSERT INTO gedung (nama_gedung, latitude, longitude, radius_meter)
VALUES ('GKB', -5.355163, 105.228601, 50);

INSERT INTO gedung (nama_gedung, latitude, longitude, radius_meter)
VALUES ('SFS', -5.354526, 105.228618, 50);
