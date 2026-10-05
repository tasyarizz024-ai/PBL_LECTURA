const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

// Jadwal: setiap malam jam 01:00
cron.schedule('0 1 * * *', () => {
  console.log('[cron] Menjalankan training model ML...');
  const script = path.join(__dirname, '..', '..', 'ml-service', 'train_model.py');
  const py = process.env.PYTHON_BIN || 'python';
  const proc = spawn(py, [script], { cwd: path.dirname(script) });
  proc.stdout.on('data', (d) => console.log(`[ml] ${d.toString().trim()}`));
  proc.stderr.on('data', (d) => console.error(`[ml-err] ${d.toString().trim()}`));
  proc.on('close', (code) => console.log(`[cron] Training selesai (exit ${code})`));
});

console.log('[cron] Scheduler training ML aktif (setiap malam 01:00).');
