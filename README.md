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

### Multi-kampus & pengelola
Skema tenant memakai tabel `campuses` dan tiga tingkat pengelola:

- **Superadmin platform** membuat kampus dan menunjuk admin kampus.
- **Admin kampus** mengelola jurusan, prodi, dosen, mahasiswa, gedung, dan dapat membuat admin jurusan/prodi.
- **Admin jurusan/prodi** hanya mengelola dosen, mahasiswa, jadwal, dan log dalam lingkup penugasannya.

Seluruh pencarian dan API data kampus memerlukan sesi; lingkup kampus/unit diambil
dari akun tersimpan di server, bukan dari `campus_id` yang dikirim klien.
Semua role dapat mengganti password sendiri melalui menu **Ubah Password**.

Untuk instalasi baru, jalankan skrip database `01_ddl_lectura.sql`,
`02_dummy_data.sql` (opsional), `04_views_sp_triggers.sql`,
`05_migration_gps_consent.sql`, `07_migration_multi_campus.sql`, lalu
`08_migration_dosen_availability.sql`.
Untuk database lama yang sudah memiliki skema dan migrasi GPS 05, jalankan
`07_migration_multi_campus.sql`, kemudian `08_migration_dosen_availability.sql`.
Jika migrasi 07 sudah berhasil dijalankan, jalankan migrasi 08 saja. Setiap
migrasi hanya dijalankan satu kali; jangan mengulang skrip DDL pada database
yang sudah berisi tabel.
Jika migrasi 08 yang sebelumnya dijalankan membuat bagian jadwal gagal dimuat,
jalankan `database/09_fix_jadwal_view.sql` satu kali untuk memperbaiki view
jadwal tanpa mengulang migrasi kolom 08.
Migrasi 07 menempatkan data lama ke kampus `Kampus Utama` dan mengubah akun
`admin` lama menjadi `admin_kampus`. Migrasi ini menangani nama indeks jurusan
baik dari skema awal maupun dari migrasi unik jurusan/prodi 06.

NIM dan NIP tetap unik secara global agar login menggunakan NIM/NIP tidak
ambigu; email pengguna juga unik secara global. Pengguna dapat login memakai
email kampusnya.

Buat superadmin pertama secara privat dari folder `backend` (hanya jika belum ada):

```powershell
$env:BOOTSTRAP_SUPERADMIN_EMAIL = "superadmin@contoh.ac.id"
$env:BOOTSTRAP_SUPERADMIN_PASSWORD = "gunakan-password-kuat-minimal-12-karakter"
npm run bootstrap:superadmin
Remove-Item Env:BOOTSTRAP_SUPERADMIN_EMAIL
Remove-Item Env:BOOTSTRAP_SUPERADMIN_PASSWORD
```

Jangan menambahkan endpoint pendaftaran superadmin publik. Login superadmin
melalui tab **Admin**, lalu buka menu **Kampus** untuk mendaftarkan kampus baru
beserta admin kampus pertama atau menambahkan admin kampus lain.

### API & Persetujuan Lokasi Dosen
Base path `/api/app-dosen` — khusus role `dosen`, data selalu milik user yang login.
Berbagi lokasi nonaktif secara default. Dosen harus login, menyetujui berbagi GPS,
dan mengizinkan akses lokasi browser/perangkat. Halaman web dosen mengirim koordinat
selama halaman aktif; mahasiswa hanya dapat melihat titik presisi yang berumur
maksimal 2 menit, dan hanya setelah login sebagai mahasiswa.

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/app-dosen/me` | GET | Profil dosen + status terkini + daftar gedung |
| `/api/app-dosen/lokasi` | POST | Kirim 1 titik GPS (backend menentukan gedung via Haversine) |
| `/api/app-dosen/lokasi/batch` | POST | Kirim antrean log offline (maks. 200) |
| `/api/app-dosen/gps` | PATCH | Toggle pelacakan (`gps_enabled`) |
| `/api/app-dosen/ketersediaan` | PATCH | Ubah status tersedia (1-12 jam) atau tidak tersedia |
| `/api/app-dosen/jadwal` | GET | Jadwal mengajar sendiri (hanya baca; perubahan melalui admin) |
| `/api/app-dosen/lokasi/riwayat` | GET | Riwayat log lokasi sendiri |
| `/api/pencarian-dosen/:id/lokasi-realtime` | GET | Titik GPS terbaru (mahasiswa terautentikasi; hanya saat dosen berbagi) |

Status ketersediaan manual berbeda dari berbagi lokasi GPS. Status tersedia
berakhir otomatis setelah durasi yang dipilih dosen (maksimal 12 jam), dan
ditampilkan kepada mahasiswa sebagai pernyataan dosen, bukan jaminan lokasi.

Untuk database yang sudah ada, jalankan `database/05_migration_gps_consent.sql`
sekali. Migrasi ini mematikan berbagi lokasi lama agar setiap dosen perlu memberi
izin secara eksplisit. Database baru memakai default nonaktif. Jika dosen berhenti
mengirim lokasi atau menonaktifkan berbagi, koordinat presisi tidak lagi ditampilkan.

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
