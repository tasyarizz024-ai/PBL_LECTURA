const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const email = process.env.BOOTSTRAP_SUPERADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD;

const run = async () => {
  if (!email || !password) {
    throw new Error('Set BOOTSTRAP_SUPERADMIN_EMAIL dan BOOTSTRAP_SUPERADMIN_PASSWORD terlebih dahulu.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Email tidak valid atau password kurang dari 12 / melebihi 72 byte.');
  }

  const [existing] = await pool.query("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1");
  if (existing.length) {
    throw new Error('Superadmin sudah tersedia; bootstrap hanya dapat dilakukan satu kali.');
  }

  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    "INSERT INTO users (email, password, role) VALUES (?, ?, 'superadmin')",
    [email, hash]
  );
  console.log('Akun superadmin berhasil dibuat.');
};

run()
  .catch((error) => {
    console.error('Bootstrap superadmin gagal:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
