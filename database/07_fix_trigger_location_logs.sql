USE lectura_db;

DROP TRIGGER IF EXISTS trg_location_logs_after_insert;

DELIMITER $$
CREATE TRIGGER trg_location_logs_after_insert
AFTER INSERT ON location_logs
FOR EACH ROW
BEGIN
  -- Hanya update current_status untuk log yang benar-benar baru (<= 15 menit).
  -- Data backfill/historis (recorded_at lama) tidak mengubah current_status.
  IF NEW.recorded_at >= NOW() - INTERVAL 15 MINUTE THEN
    INSERT INTO current_status (dosen_id, status_type, gedung_id, probabilitas, last_updated)
    VALUES (NEW.dosen_id, 'realtime', NEW.gedung_id, NULL, NEW.recorded_at)
    ON DUPLICATE KEY UPDATE
      status_type  = 'realtime',
      gedung_id    = NEW.gedung_id,
      probabilitas = NULL,
      last_updated = NEW.recorded_at;
  END IF;
END$$
DELIMITER ;
