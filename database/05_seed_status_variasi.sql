
USE lectura_db;

-- 1) Matikan GPS aktif untuk dosen 1,2 (prediksi) dan dosen 3 (tidak diketahui)
DELETE FROM location_logs WHERE dosen_id IN (1,2,3);

-- 2) Habit summary untuk dosen 1 & 2: slot hari ini mencakup CURTIME()
INSERT INTO habit_summary (dosen_id, hari, jam_mulai, jam_selesai, gedung_id, probabilitas)
VALUES
  (1, ELT(WEEKDAY(CURDATE())+1,'senin','selasa','rabu','kamis','jumat','sabtu','minggu'),
   CURTIME() - INTERVAL 2 HOUR, CURTIME() + INTERVAL 2 HOUR, 2, 82.50),
  (2, ELT(WEEKDAY(CURDATE())+1,'senin','selasa','rabu','kamis','jumat','sabtu','minggu'),
   CURTIME() - INTERVAL 1 HOUR, CURTIME() + INTERVAL 3 HOUR, 3, 74.00)
ON DUPLICATE KEY UPDATE jam_selesai = VALUES(jam_selesai), probabilitas = VALUES(probabilitas);

-- 3) Jalankan prediksi
CALL sp_refresh_prediksi(1);
CALL sp_refresh_prediksi(2);
CALL sp_refresh_prediksi(3);

-- 4) Status akhir
SELECT d.id, d.nama, cs.status_type, cs.gedung_id, cs.probabilitas, cs.last_updated
FROM dosen d LEFT JOIN current_status cs ON cs.dosen_id = d.id ORDER BY d.id;
SELECT status_type, COUNT(*) jumlah FROM current_status GROUP BY status_type;
