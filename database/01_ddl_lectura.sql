-- =====================================================================
-- LECTURA — Smart Lecturer Availability System
-- DDL Skema Database (MySQL 8.x)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS lectura_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lectura_db;

-- ---------------------------------------------------------------------
-- 1. jurusan
-- ---------------------------------------------------------------------
CREATE TABLE jurusan (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama_jurusan  VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. prodi
-- ---------------------------------------------------------------------
CREATE TABLE prodi (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  jurusan_id  INT UNSIGNED NOT NULL,
  nama_prodi  VARCHAR(100) NOT NULL,
  CONSTRAINT uq_prodi_nama UNIQUE (jurusan_id, nama_prodi),
  CONSTRAINT fk_prodi_jurusan
    FOREIGN KEY (jurusan_id) REFERENCES jurusan(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. users
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('admin','dosen','mahasiswa') NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
              ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. dosen
-- ---------------------------------------------------------------------
CREATE TABLE dosen (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL UNIQUE,
  prodi_id      INT UNSIGNED NOT NULL,
  nip           VARCHAR(20) NOT NULL UNIQUE,
  nama          VARCHAR(100) NOT NULL,
  jabatan       VARCHAR(50),
  foto          VARCHAR(255),
  gps_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_dosen_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_dosen_prodi
    FOREIGN KEY (prodi_id) REFERENCES prodi(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. mahasiswa
-- ---------------------------------------------------------------------
CREATE TABLE mahasiswa (
  id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id  INT UNSIGNED NOT NULL UNIQUE,
  nim      VARCHAR(20) NOT NULL UNIQUE,
  nama     VARCHAR(100) NOT NULL,
  prodi    VARCHAR(50),
  CONSTRAINT fk_mahasiswa_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. gedung
-- ---------------------------------------------------------------------
CREATE TABLE gedung (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama_gedung   VARCHAR(100) NOT NULL,
  latitude      DECIMAL(10,7) NOT NULL,
  longitude     DECIMAL(10,7) NOT NULL,
  radius_meter  INT UNSIGNED NOT NULL DEFAULT 50
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. location_logs
-- ---------------------------------------------------------------------
CREATE TABLE location_logs (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dosen_id     INT UNSIGNED NOT NULL,
  latitude     DECIMAL(10,7) NOT NULL,
  longitude    DECIMAL(10,7) NOT NULL,
  gedung_id    INT UNSIGNED NULL,
  recorded_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_loclog_dosen
    FOREIGN KEY (dosen_id) REFERENCES dosen(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_loclog_gedung
    FOREIGN KEY (gedung_id) REFERENCES gedung(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_loclog_dosen_time (dosen_id, recorded_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. habit_summary
-- ---------------------------------------------------------------------
CREATE TABLE habit_summary (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dosen_id      INT UNSIGNED NOT NULL,
  hari          ENUM('senin','selasa','rabu','kamis','jumat','sabtu','minggu') NOT NULL,
  jam_mulai     TIME NOT NULL,
  jam_selesai   TIME NOT NULL,
  gedung_id     INT UNSIGNED NOT NULL,
  probabilitas  DECIMAL(5,2) NOT NULL,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_habit_dosen
    FOREIGN KEY (dosen_id) REFERENCES dosen(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_habit_gedung
    FOREIGN KEY (gedung_id) REFERENCES gedung(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_habit_probabilitas
    CHECK (probabilitas BETWEEN 0 AND 100),
  UNIQUE KEY uq_habit_slot (dosen_id, hari, jam_mulai)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. current_status
-- ---------------------------------------------------------------------
CREATE TABLE current_status (
  dosen_id      INT UNSIGNED PRIMARY KEY,
  status_type   ENUM('realtime','prediksi','tidak_diketahui') NOT NULL DEFAULT 'tidak_diketahui',
  gedung_id     INT UNSIGNED NULL,
  probabilitas  DECIMAL(5,2) NULL,
  last_updated  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_status_dosen
    FOREIGN KEY (dosen_id) REFERENCES dosen(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_status_gedung
    FOREIGN KEY (gedung_id) REFERENCES gedung(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_status_probabilitas
    CHECK (probabilitas IS NULL OR probabilitas BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. jadwal_mengajar
-- ---------------------------------------------------------------------
CREATE TABLE jadwal_mengajar (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dosen_id      INT UNSIGNED NOT NULL,
  hari          ENUM('senin','selasa','rabu','kamis','jumat','sabtu','minggu') NOT NULL,
  jam_mulai     TIME NOT NULL,
  jam_selesai   TIME NOT NULL,
  mata_kuliah   VARCHAR(100) NOT NULL,
  gedung_id     INT UNSIGNED NOT NULL,
  CONSTRAINT fk_jadwal_dosen
    FOREIGN KEY (dosen_id) REFERENCES dosen(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_jadwal_gedung
    FOREIGN KEY (gedung_id) REFERENCES gedung(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_jadwal_dosen_hari (dosen_id, hari)
) ENGINE=InnoDB;
