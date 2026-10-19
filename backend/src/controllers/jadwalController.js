const { pool } = require('../config/db');
const xlsx = require('xlsx');
const { getProdiScope } = require('../utils/tenantScope');

const HARI_VALID = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];

const isValidTime = (t) => /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(String(t).trim());

const toTime = (t) => {
  const s = String(t).trim();
  return s.length === 5 ? `${s}:00` : s;
};

// Cek bentrok: jadwal dosen lain di hari yang sama overlap waktu (exclude id tertentu saat edit)
const hasConflict = async (dosen_id, hari, jam_mulai, jam_selesai, excludeId = null) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM jadwal_mengajar
     WHERE dosen_id = ? AND hari = ? AND jam_mulai < ? AND jam_selesai > ?
     ${excludeId ? 'AND id != ?' : ''}`,
    excludeId
      ? [dosen_id, hari, toTime(jam_selesai), toTime(jam_mulai), excludeId]
      : [dosen_id, hari, toTime(jam_selesai), toTime(jam_mulai)]
  );
  return rows[0].c > 0;
};

const getJadwal = async (req, res) => {
  try {
    const { dosen_id, hari, prodi_id } = req.query;
    const scope = getProdiScope(req.user, 'p', 'j');
    let sql = `
      SELECT jm.id, jm.dosen_id, d.nama AS nama_dosen, jm.hari, jm.jam_mulai, jm.jam_selesai,
             jm.mata_kuliah, jm.gedung_id, g.nama_gedung, p.nama_prodi
      FROM jadwal_mengajar jm
      JOIN dosen d ON d.id = jm.dosen_id
      JOIN prodi p ON p.id = d.prodi_id
      JOIN jurusan j ON j.id = p.jurusan_id
      JOIN gedung g ON g.id = jm.gedung_id
      WHERE ${scope.sql}`;
    const params = [...scope.params];
    if (dosen_id) { sql += ' AND jm.dosen_id = ?'; params.push(dosen_id); }
    if (prodi_id) { sql += ' AND d.prodi_id = ?'; params.push(prodi_id); }
    if (hari) { sql += ' AND jm.hari = ?'; params.push(hari); }
    sql += " ORDER BY FIELD(jm.hari,'senin','selasa','rabu','kamis','jumat','sabtu','minggu'), jm.jam_mulai";
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const validateAssignmentScope = async (req, dosenId, gedungId) => {
  const scope = getProdiScope(req.user, 'p', 'j');
  const [rows] = await pool.query(
    `SELECT d.id
     FROM dosen d
     JOIN prodi p ON p.id = d.prodi_id
     JOIN jurusan j ON j.id = p.jurusan_id
     JOIN gedung g ON g.id = ? AND g.campus_id = j.campus_id
     WHERE d.id = ? AND ${scope.sql}
     LIMIT 1`,
    [gedungId, dosenId, ...scope.params]
  );
  return rows.length > 0;
};

const createJadwal = async (req, res) => {
  try {
    const { dosen_id, hari, jam_mulai, jam_selesai, mata_kuliah, gedung_id } = req.body;
    if (!dosen_id || !hari || !jam_mulai || !jam_selesai || !mata_kuliah || !gedung_id) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi.' });
    }
    if (!HARI_VALID.includes(String(hari).toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Hari tidak valid.' });
    }
    if (!isValidTime(jam_mulai) || !isValidTime(jam_selesai)) {
      return res.status(400).json({ success: false, message: 'Format jam tidak valid (HH:MM).' });
    }
    if (toTime(jam_selesai) <= toTime(jam_mulai)) {
      return res.status(400).json({ success: false, message: 'jam_selesai harus lebih besar dari jam_mulai.' });
    }
    if (!(await validateAssignmentScope(req, dosen_id, gedung_id))) {
      return res.status(403).json({ success: false, message: 'Dosen atau gedung di luar cakupan admin.' });
    }
    if (await hasConflict(dosen_id, hari, jam_mulai, jam_selesai)) {
      return res.status(409).json({ success: false, message: 'Bentrok: dosen sudah punya jadwal lain yang overlap di hari & jam yang sama.' });
    }
    const [r] = await pool.query(
      'INSERT INTO jadwal_mengajar (dosen_id, hari, jam_mulai, jam_selesai, mata_kuliah, gedung_id) VALUES (?,?,?,?,?,?)',
      [dosen_id, hari, toTime(jam_mulai), toTime(jam_selesai), mata_kuliah.trim(), gedung_id]
    );
    res.status(201).json({ success: true, message: 'Jadwal berhasil ditambahkan.', id: r.insertId });
  } catch (e) {
    if (e.sqlState === '45000' || /jam_selesai/.test(e.message)) {
      return res.status(400).json({ success: false, message: 'jam_selesai harus lebih besar dari jam_mulai.' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
};

const updateJadwal = async (req, res) => {
  try {
    const { id } = req.params;
    const { dosen_id, hari, jam_mulai, jam_selesai, mata_kuliah, gedung_id } = req.body;
    if (!dosen_id || !hari || !jam_mulai || !jam_selesai || !mata_kuliah || !gedung_id) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi.' });
    }
    if (!HARI_VALID.includes(hari)) return res.status(400).json({ success: false, message: 'Hari tidak valid.' });
    if (!isValidTime(jam_mulai) || !isValidTime(jam_selesai)) {
      return res.status(400).json({ success: false, message: 'Format jam tidak valid (HH:MM).' });
    }
    if (toTime(jam_selesai) <= toTime(jam_mulai)) {
      return res.status(400).json({ success: false, message: 'jam_selesai harus lebih besar dari jam_mulai.' });
    }
    const scope = getProdiScope(req.user, 'p', 'j');
    const [existing] = await pool.query(
      `SELECT jm.id FROM jadwal_mengajar jm
       JOIN dosen d ON d.id = jm.dosen_id
       JOIN prodi p ON p.id = d.prodi_id
       JOIN jurusan j ON j.id = p.jurusan_id
       WHERE jm.id = ? AND ${scope.sql}`,
      [id, ...scope.params]
    );
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan dalam cakupan admin.' });
    }
    if (!(await validateAssignmentScope(req, dosen_id, gedung_id))) {
      return res.status(403).json({ success: false, message: 'Dosen atau gedung di luar cakupan admin.' });
    }
    if (await hasConflict(dosen_id, hari, jam_mulai, jam_selesai, id)) {
      return res.status(409).json({ success: false, message: 'Bentrok: dosen sudah punya jadwal lain yang overlap di hari & jam yang sama.' });
    }
    const [r] = await pool.query(
      'UPDATE jadwal_mengajar SET dosen_id=?, hari=?, jam_mulai=?, jam_selesai=?, mata_kuliah=?, gedung_id=? WHERE id=?',
      [dosen_id, hari, toTime(jam_mulai), toTime(jam_selesai), mata_kuliah.trim(), gedung_id, id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
    res.json({ success: true, message: 'Jadwal berhasil diperbarui.' });
  } catch (e) {
    if (e.sqlState === '45000' || /jam_selesai/.test(e.message)) {
      return res.status(400).json({ success: false, message: 'jam_selesai harus lebih besar dari jam_mulai.' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
};

const deleteJadwal = async (req, res) => {
  try {
    const scope = getProdiScope(req.user, 'p', 'j');
    const [r] = await pool.query(
      `DELETE jm FROM jadwal_mengajar jm
       JOIN dosen d ON d.id = jm.dosen_id
       JOIN prodi p ON p.id = d.prodi_id
       JOIN jurusan j ON j.id = p.jurusan_id
       WHERE jm.id = ? AND ${scope.sql}`,
      [req.params.id, ...scope.params]
    );
    if (r.affectedRows === 0) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
    res.json({ success: true, message: 'Jadwal berhasil dihapus.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /jadwal-mengajar/import (multer memory storage) — file CSV/XLSX
const importJadwal = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File tidak ditemukan.' });
    const isCsv = (req.file.originalname || '').toLowerCase().endsWith('.csv');
    let rows;
    if (isCsv) {
      // Parse CSV manual agar NIP panjang tidak dibaca sebagai number (kehilangan digit)
      const text = req.file.buffer.toString('utf-8').replace(/^﻿/, '');
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      rows = lines.slice(1).map((line) => {
        const vals = line.split(',');
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = (vals[idx] || '').trim(); });
        return obj;
      });
    } else {
      const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false });
    }
    if (!rows || rows.length === 0) return res.status(400).json({ success: false, message: 'File kosong.' });

    const scope = getProdiScope(req.user, 'p', 'j');
    const [dosenRows] = await pool.query(
      `SELECT d.id, d.nip FROM dosen d
       JOIN prodi p ON p.id = d.prodi_id JOIN jurusan j ON j.id = p.jurusan_id
       WHERE ${scope.sql}`,
      scope.params
    );
    const nipMap = Object.fromEntries(dosenRows.map((d) => [d.nip.trim(), d.id]));
    const [gedungRows] = await pool.query(
      'SELECT id, nama_gedung FROM gedung WHERE campus_id = ?',
      [req.user.campus_id]
    );
    const gedungMap = Object.fromEntries(gedungRows.map((g) => [g.nama_gedung.trim().toLowerCase(), g.id]));

    let berhasil = 0;
    const gagal = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const nip = String(r.nip_dosen || '').trim();
      const hari = String(r.hari || '').trim().toLowerCase();
      const jamMulai = String(r.jam_mulai || '').trim();
      const jamSelesai = String(r.jam_selesai || '').trim();
      const matkul = String(r.mata_kuliah || '').trim();
      const namaGedung = String(r.nama_gedung || '').trim().toLowerCase();
      const baris = i + 2; // header row 1

      if (!nipMap[nip]) { gagal.push({ baris, alasan: `NIP '${nip}' tidak ditemukan` }); continue; }
      if (!HARI_VALID.includes(hari)) { gagal.push({ baris, alasan: `Hari '${hari}' tidak valid` }); continue; }
      if (!isValidTime(jamMulai) || !isValidTime(jamSelesai)) { gagal.push({ baris, alasan: 'Format jam tidak valid' }); continue; }
      if (toTime(jamSelesai) <= toTime(jamMulai)) { gagal.push({ baris, alasan: 'jam_selesai harus lebih besar dari jam_mulai' }); continue; }
      if (!matkul) { gagal.push({ baris, alasan: 'mata_kuliah kosong' }); continue; }
      if (!gedungMap[namaGedung]) { gagal.push({ baris, alasan: `Gedung '${r.nama_gedung}' tidak ditemukan` }); continue; }
      const dosen_id = nipMap[nip];
      try {
        if (await hasConflict(dosen_id, hari, jamMulai, jamSelesai)) {
          gagal.push({ baris, alasan: 'Bentrok dengan jadwal lain di hari & jam sama' }); continue;
        }
        await pool.query(
          'INSERT INTO jadwal_mengajar (dosen_id, hari, jam_mulai, jam_selesai, mata_kuliah, gedung_id) VALUES (?,?,?,?,?,?)',
          [dosen_id, hari, toTime(jamMulai), toTime(jamSelesai), matkul, gedungMap[namaGedung]]
        );
        berhasil++;
      } catch (err) {
        gagal.push({ baris, alasan: err.message });
      }
    }
    res.json({ success: true, berhasil, gagal_count: gagal.length, gagal });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const downloadTemplate = (req, res) => {
  const header = 'nip_dosen,hari,jam_mulai,jam_selesai,mata_kuliah,nama_gedung\n';
  const contoh = '198501012010011001,senin,08:00,10:00,Basis Data II,GSG\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="template_jadwal.csv"');
  res.send(header + contoh);
};

module.exports = { getJadwal, createJadwal, updateJadwal, deleteJadwal, importJadwal, downloadTemplate };
