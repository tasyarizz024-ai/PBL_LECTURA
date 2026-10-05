// Generator untuk database/05_dummy_location_logs_training.sql
// Pola kebiasaan 5 dosen, 14 hari terakhir, 2-3 log per slot, ada hari libur GPS.
const fs = require('fs');

const GEDUNG = {
  1: { nama: 'GSG',    lat: -5.3569740, lng: 105.2321670 },
  2: { nama: 'Sakura', lat: -5.3563410, lng: 105.2323700 },
  3: { nama: 'PPA',    lat: -5.3560970, lng: 105.2314050 },
  5: { nama: 'GKB',    lat: -5.3551630, lng: 105.2286010 },
  6: { nama: 'SFS',    lat: -5.3545260, lng: 105.2286180 },
};

// dow: 0=Minggu ... 6=Sabtu (sama seperti Date#getDay)
const PATTERNS = [
  { dosen: 1, slots: [
    { dows: [1, 3], start: '08:00', end: '10:00', gedung: 1 },
    { dows: [1, 3], start: '13:00', end: '15:00', gedung: 3 },
  ]},
  { dosen: 2, slots: [
    { dows: [2, 4], start: '09:00', end: '11:00', gedung: 2 },
    { dows: [2, 4], start: '14:00', end: '16:00', gedung: 5 },
  ]},
  { dosen: 3, slots: [
    { dows: [1, 3, 5], start: '10:00', end: '12:00', gedung: 3 },
    { dows: [1, 3, 5], start: '15:00', end: '17:00', gedung: 6 },
  ]},
  { dosen: 4, slots: [
    { dows: [2, 5], start: '08:00', end: '10:00', gedung: 5 },
    { dows: [3],       start: '13:00', end: '15:00', gedung: 6 },
  ]},
  { dosen: 5, slots: [
    { dows: [1],       start: '14:00', end: '16:00', gedung: 1 },
    { dows: [3, 4],    start: '11:00', end: '13:00', gedung: 6 },
  ]},
];

function toMinutes(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function fmt(min) {
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}:00`;
}

const rows = [];
for (let d = 13; d >= 0; d--) {
  const date = new Date();
  date.setDate(date.getDate() - d);
  const dow = date.getDay();
  for (const p of PATTERNS) {
    for (const s of p.slots) {
      if (!s.dows.includes(dow)) continue;
      // Simulasi GPS nonaktif: ~30% slot dilewati (deterministik)
      if ((d * 7 + p.dosen * 3 + s.start.length) % 10) { /* proceed */ }
      if ((d + p.dosen + toMinutes(s.start)) % 7 === 0) continue; // skip ~1/7 slot
      const g = GEDUNG[s.gedung];
      const start = toMinutes(s.start), end = toMinutes(s.end);
      const mid = Math.floor((start + end) / 2);
      const count = (d + p.dosen) % 2 === 0 ? 3 : 2;
      const times = count === 3 ? [start + 5, mid, end - 5] : [start + 5, end - 5];
      for (const t of times) {
        rows.push({ dosen: p.dosen, gedung: s.gedung, t, d, g });
      }
    }
  }
}
// Urutkan kronologis agar trigger current_status konsisten
rows.sort((a, b) => b.d - a.d || a.t - b.t);

const values = rows.map(r =>
  `(${r.dosen}, ${r.g.lat}, ${r.g.lng}, ${r.gedung}, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL ${r.d} DAY), '${fmt(r.t)}'))`
).join(',\n');

const sql = `-- 05_dummy_location_logs_training.sql
-- Data latih location_logs: 14 hari histori, pola kebiasaan per dosen,
-- 2-3 log per slot, sebagian slot sengaja dikosongkan (GPS nonaktif).
-- Gedung: 1=GSG, 2=Sakura, 3=PPA, 5=GKB, 6=SFS

USE lectura_db;

INSERT INTO location_logs (dosen_id, latitude, longitude, gedung_id, recorded_at) VALUES
${values};
`;

fs.writeFileSync('database/05_dummy_location_logs_training.sql', sql);
console.log('Total baris:', rows.length);
