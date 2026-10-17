# PRD: LECTURA Web — Final (Update)

## 1. Ringkasan

Web Dashboard LECTURA untuk 2 aktor: **Mahasiswa** (cari & pantau status dosen) dan **Admin** (kelola data & infrastruktur pelacakan). Dosen berinteraksi lewat aplikasi Android terpisah (di luar scope dokumen ini).

## 2. Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js + Express |
| Database | MySQL |
| **Machine Learning Service** | **Python + scikit-learn** (service terpisah, `ml-service/`) — melatih model Decision Tree Classifier per dosen dari data `location_logs`, dijalankan berkala (cron) untuk memperbarui `habit_summary` |

## 3. Personas

- **Mahasiswa** — cari dosen cepat, filter by prodi/jurusan, lihat status & jadwal
- **Admin** — kelola data master (dosen, gedung, jurusan/prodi), pantau aktivitas lokasi

## 4. Screen List & Detail

### A. Autentikasi

**Login ("Masuk ke Akun")**

- Tab pilih peran: Mahasiswa / Admin-Staff
- Login pakai Email Kampus atau NIM + password
- Link "Lupa password?"

### B. Mahasiswa

**1. Dashboard Cari Dosen ("Portal Mahasiswa")**

- Search bar (nama/NIP)
- Filter by **Prodi** (dan/atau Jurusan) — bukan fakultas
- Grid/list kartu dosen: foto, nama, badge status (Hijau "Terlacak" / Biru "Prediksi" / Abu "Tidak diketahui")

**2. Detail & Status Dosen**

- Header: foto, nama, NIP, jabatan, prodi
- Status card utama (real-time/prediksi + confidence %)
- Lokasi visual di peta kampus (titik gedung)
- **Jadwal mengajar hari itu** — daftar singkat "Ruang X, 10:00–12:00, Mata Kuliah Y" (bukan jadwal lengkap kelas mahasiswa spesifik seperti e-Kuliah, tapi jadwal dosen di semua kelas)
- Probabilitas prediksi ketersediaan **dihasilkan oleh model Machine Learning** (Decision Tree Classifier) yang dilatih dari histori aktivitas 7 hari terakhir — bukan perhitungan manual
- Timestamp update terakhir

### C. Admin

**1. Admin Dashboard**

- Kartu statistik: dosen aktif GPS, total dosen, total gedung *(tanpa metrik IoT/beacon — dropped)*

**2. Manajemen Dosen**

- Tabel dosen (search, filter by prodi)
- Form tambah/edit: nama, NIP, jabatan, foto, **prodi**
- Konfirmasi delete

**3. Manajemen Gedung & Geofence**

- Tabel gedung
- Form tambah/edit: nama gedung + peta interaktif (klik titik pusat + input radius meter)

**4. Log Aktivitas Lokasi**

- Tabel/timeline riwayat lokasi per dosen, filter tanggal & dosen

*(Manajemen Jurusan/Prodi juga perlu ada sebagai data master pendukung filter — bisa jadi sub-menu sederhana di bawah Manajemen Dosen atau menu terpisah.)*

## 5. Functional Requirements (ringkas)

| Fitur | Prioritas | Catatan |
| --- | --- | --- |
| Login dengan tab peran | Must | Mahasiswa / Admin |
| Cari & filter dosen (prodi/jurusan) | Must | Bukan fakultas |
| Status real-time vs prediksi | Must | Prediksi dihasilkan model ML (Decision Tree), diferensiasi visual wajib jelas |
| Jadwal mengajar dosen (harian) | Should | Sumber tambahan untuk prediksi, bukan pengganti e-Kuliah |
| CRUD data master (dosen, gedung, jurusan/prodi) | Must | |
| Mapping gedung ↔ geofence | Should | Peta interaktif |
| Log histori lokasi | Should | |

## 6. Fitur Prediksi Ketersediaan Dosen (Machine Learning)

Sistem menggunakan model **Machine Learning (Decision Tree Classifier)** yang dilatih dari data historis lokasi dosen (`location_logs`) selama 7 hari terakhir. Model mempelajari pola hari dan jam terhadap gedung tempat dosen biasa berada, lalu menghasilkan probabilitas prediksi untuk tiap kombinasi hari+jam. Proses pelatihan ulang (retraining) dijalankan otomatis setiap malam melalui scheduled job (cron), dan hasilnya disimpan ke tabel `habit_summary` untuk dikonsumsi oleh fitur pencarian & detail dosen.

## 7. Visual Design Guidelines

- **Mood**: Modern, calm, minimalis
- **Style**: Gradasi biru-ungu pastel (`#6B8CFF` → `#A78BFA`), glassmorphism/soft-UI, rounded corner besar, soft shadow
- **Status colors**: Hijau (real-time), Biru (prediksi), Abu (tidak diketahui)
- **Tipografi**: Sans-serif rounded (Poppins/Inter/Nunito)
- Admin: tabel & form tetap flat/clean untuk keterbacaan, gradient hanya di header/hero/stat card

## 8. Out of Scope

- Aplikasi Android dosen
- Hardware/beacon/IoT fisik (murni tidak ada — bukan cuma dummy)
- Chatbot
- Fitur follow/notifikasi
- Jadwal kelas lengkap ala e-Kuliah (hanya jadwal dosen sebagai konteks lokasi)