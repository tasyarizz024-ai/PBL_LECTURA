const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { pool, testConnection } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const dosenRoutes = require('./routes/dosenRoutes');
const gedungRoutes = require('./routes/gedungRoutes');
const pencarianDosenRoutes = require('./routes/pencarianDosenRoutes');
const logAktivitasRoutes = require('./routes/logAktivitasRoutes');
const jurusanProdiRoutes = require('./routes/jurusanProdiRoutes');
const jadwalRoutes = require('./routes/jadwalRoutes');
const appDosenRoutes = require('./routes/appDosenRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const mahasiswaRoutes = require('./routes/mahasiswaRoutes');
const tenantRoutes = require('./routes/tenantRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dosen', dosenRoutes);
app.use('/api/gedung', gedungRoutes);
app.use('/api/pencarian-dosen', pencarianDosenRoutes);
app.use('/api/log-aktivitas', logAktivitasRoutes);
app.use('/api/jurusan-prodi', jurusanProdiRoutes);
app.use('/api/jadwal-mengajar', jadwalRoutes);
// API khusus aplikasi / dashboard dosen
app.use('/api/app-dosen', appDosenRoutes);
// API manajemen user admin
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/mahasiswa', mahasiswaRoutes);
app.use('/api/tenant', tenantRoutes);

// Basic health check route
app.get('/', (req, res) => {
  res.json({
    message: 'LECTURA API Server is running',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

// Database health check route
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({
      status: 'healthy',
      database: 'connected',
      check: rows[0].result === 2 ? 'ok' : 'unexpected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: error.message,
    });
  }
});

require('./jobs/trainModelJob');
require('./jobs/refreshPredictionJob');

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 LECTURA Backend running on http://localhost:${PORT}`);
  await testConnection();
});
