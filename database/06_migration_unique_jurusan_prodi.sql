USE lectura_db;
DELETE FROM jurusan WHERE id = 4 AND nama_jurusan = 'Teknik Elektro';
DELETE FROM prodi WHERE id = 4;
ALTER TABLE jurusan DROP INDEX nama_jurusan;
ALTER TABLE jurusan ADD CONSTRAINT uq_jurusan_nama UNIQUE (nama_jurusan);
ALTER TABLE prodi DROP INDEX nama_prodi;
ALTER TABLE prodi ADD CONSTRAINT uq_prodi_nama UNIQUE (jurusan_id, nama_prodi);
SELECT id, nama_jurusan FROM jurusan;
SELECT p.id, p.nama_prodi, j.nama_jurusan FROM prodi p JOIN jurusan j ON j.id=p.jurusan_id;
