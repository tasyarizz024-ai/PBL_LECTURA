const cron = require('node-cron');
const { pool } = require('../config/db');

// Refresh status prediksi tiap menit untuk semua dosen.
// sp_refresh_prediksi: realtime bila ada log < 15 menit,
// fallback ke habit_summary (prediksi), else tidak_diketahui.
cron.schedule('* * * * *', async () => {
  try {
    const [dosen] = await pool.query('SELECT id FROM dosen');
    for (const d of dosen) {
      await pool.query('CALL sp_refresh_prediksi(?)', [d.id]);
    }
  } catch (err) {
    console.error('[cron] Refresh prediksi gagal:', err.message);
  }
});

console.log('[cron] Scheduler refresh prediksi aktif (tiap 1 menit).');
