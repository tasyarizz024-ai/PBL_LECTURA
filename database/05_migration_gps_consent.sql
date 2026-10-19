-- Disable historical implicit GPS sharing so each lecturer must opt in.
USE lectura_db;

ALTER TABLE dosen
  ALTER COLUMN gps_enabled SET DEFAULT FALSE;

UPDATE dosen
SET gps_enabled = FALSE;

UPDATE current_status
SET status_type = 'tidak_diketahui',
    gedung_id = NULL,
    probabilitas = NULL,
    last_updated = NOW()
WHERE dosen_id IN (SELECT id FROM dosen);

DROP PROCEDURE IF EXISTS sp_tambah_dosen;

DELIMITER $$

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
  VALUES (v_user_id, p_prodi_id, p_nip, p_nama, p_jabatan, FALSE);

  COMMIT;
END$$

DELIMITER ;
