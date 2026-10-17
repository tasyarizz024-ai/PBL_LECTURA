# LECTURA — Smart Lecturer Availability System

Sistem pelacakan ketersediaan dosen berbasis web untuk dua aktor: **Mahasiswa** (pencarian dosen, status lokasi real-time/prediksi, jadwal harian) dan **Admin** (manajemen data master dosen, jurusan/prodi, gedung & geofence, serta log aktivitas).

---

## 📁 Struktur Project

```text
S-LECTURA/
├── backend/               # Node.js + Express REST API
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js      # Koneksi pool MySQL (lectura_db)
│   │   └── server.js      # Express server & health check
│   ├── .env.example       # Template env DB & port
│   ├── .env               # Konfigurasi aktif lokal
│   └── package.json
├── database/              # Skrip SQL skema & dummy data
│   ├── 01_ddl_lectura.sql # DDL 10 tabel utama
│   ├── 02_dummy_data.sql  # Data dummy awal
│   ├── 03_crud_queries.sql# Contoh query CRUD
│   └── 04_views_sp_triggers.sql # 3 Views, Triggers & Stored Procedures
├── docs/                  # Dokumentasi & PRD
│   ├── PRD.md             # Dokumen Product Requirements
│   ├── SPESIFIKASI_APLIKASI_DOSEN.md # Rujukan pembuatan aplikasi Android Dosen
│   └── skema-database.docx# Dokumentasi rancangan skema
├── frontend/              # React (Vite) Single Page Application
│   ├── src/
│   │   ├── App.jsx        # Landing status dasar & tester koneksi
│   │   ├── App.css        # Styling glassmorphism & status cards
│   │   ├── index.css      # Design system tokens (gradasi #6B8CFF -> #A78BFA)
│   │   └── main.jsx
│   ├── vite.config.js     # Dev server proxy ke backend port 5000
│   └── package.json
└── README.md
```

---

## 🗄️ Database (MySQL)

Database yang digunakan: **`lectura_db`**.
Skema mencakup:
- **Tabel**: `jurusan`, `prodi`, `users`, `dosen`, `mahasiswa`, `gedung`, `location_logs`, `habit_summary`, `current_status`, `jadwal_mengajar`.
- **Views**: `v_pencarian_dosen`, `v_jadwal_dosen`, `v_log_aktivitas`.
- **Triggers**: `trg_location_logs_after_insert`, `trg_jadwal_mengajar_before_insert`.
- **Stored Procedures**: `sp_tambah_dosen`, `sp_refresh_prediksi`.

### API Aplikasi Dosen (Android)
Base path `/api/app-dosen` — khusus role `dosen`, data selalu milik user yang login:

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/app-dosen/me` | GET | Profil dosen + status terkini + daftar gedung |
| `/api/app-dosen/lokasi` | POST | Kirim 1 titik GPS (backend menentukan gedung via Haversine) |
| `/api/app-dosen/lokasi/batch` | POST | Kirim antrean log offline (maks. 200) |
| `/api/app-dosen/gps` | PATCH | Toggle pelacakan (`gps_enabled`) |
| `/api/app-dosen/jadwal` | GET | Jadwal mengajar sendiri |
| `/api/app-dosen/lokasi/riwayat` | GET | Riwayat log lokasi sendiri |

Rincian kontrak request/response & spesifikasi tampilan aplikasi ada di
`docs/SPESIFIKASI_APLIKASI_DOSEN.md`.

---

## 🚀 Cara Menjalankan

### 1. Menjalankan Backend
```bash
cd backend
npm run dev
# Server berjalan di http://localhost:5000
# Health check: http://localhost:5000/api/health
```

### 2. Menjalankan Frontend
```bash
cd frontend
npm run dev
# Frontend berjalan di http://localhost:3000
```

### 3. ML Service (Prediksi Lokasi Dosen)
```bash
cd ml-service
pip install -r requirements.txt
python train_model.py
# Membaca location_logs dari MySQL, training Decision Tree per dosen,
# lalu UPSERT hasilnya ke tabel habit_summary.

# Jika perintah `python` tidak dikenali, pakai path lengkap, mis:
# & "C:\Users\User\AppData\Local\Programs\Python\Python312\python.exe" train_model.py
```
Backend menjadwalkan ulang script ini otomatis setiap malam jam 01:00
(node-cron di `backend/src/jobs/trainModelJob.js`). Jika `python` tidak ada di
PATH, set env `PYTHON_BIN` ke path lengkap python.exe sebelum menjalankan backend.
