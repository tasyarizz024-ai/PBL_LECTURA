import React, { useState, useEffect, useRef } from 'react';
import { apiJson, getStoredUser } from '../lib/api';
import theme from '../styles/theme';
import ChangePasswordModal from '../components/ChangePasswordModal';

export default function DosenDashboard({ onLogout }) {
  const currentUser = getStoredUser();

  // State Profil & Status
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');

  // Tabs: 'pelacakan' | 'jadwal' | 'riwayat'
  const [activeTab, setActiveTab] = useState('pelacakan');

  // Change Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // ── Geolocation Tracker State ─────────────────────────────────────────────
  const [isTracking, setIsTracking] = useState(false);
  const [geoCoords, setGeoCoords] = useState(null); // { lat, lng, accuracy, speed }
  const [trackingStatusText, setTrackingStatusText] = useState('Pelacakan nonaktif');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [nearestGedung, setNearestGedung] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const watchIdRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const lastCoordsRef = useRef(null);

  // ── Jadwal Mengajar State ─────────────────────────────────────────────────
  const [jadwalList, setJadwalList] = useState([]);
  const [selectedDayFilter, setSelectedDayFilter] = useState('semua');
  const [loadingJadwal, setLoadingJadwal] = useState(false);
  const [jadwalError, setJadwalError] = useState('');
  const [jadwalSuccess, setJadwalSuccess] = useState('');

  // Modal Tambah/Edit Jadwal
  const [isJadwalModalOpen, setIsJadwalModalOpen] = useState(false);
  const [editingJadwal, setEditingJadwal] = useState(null); // null = tambah, object = edit
  const [jadwalFormSubmitting, setJadwalFormSubmitting] = useState(false);
  const [jadwalFormError, setJadwalFormError] = useState('');
  const [jadwalFormData, setJadwalFormData] = useState({
    hari: 'senin',
    jam_mulai: '08:00',
    jam_selesai: '10:30',
    mata_kuliah: '',
    gedung_id: '',
  });

  // Modal Delete Jadwal
  const [deleteJadwalTarget, setDeleteJadwalTarget] = useState(null);
  const [deleteJadwalLoading, setDeleteJadwalLoading] = useState(false);

  // ── Riwayat Lokasi State ──────────────────────────────────────────────────
  const [riwayatLogs, setRiwayatLogs] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);
  const [riwayatError, setRiwayatError] = useState('');


  // ── 1. Fetch Profil Dosen ─────────────────────────────────────────────────
  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      setProfileError('');
      const res = await apiJson('/api/app-dosen/me');
      setProfile(res.data);
      // Sinkronkan status tracking awal dari DB
      if (res.data?.gps_enabled && !isTracking) {
        // Jika di DB gps_enabled = true, kita tidak otomatis start watchPosition
        // tanpa gestur pengguna, tapi kita tandai siap aktif
      }
      if (res.gedung?.length > 0 && !jadwalFormData.gedung_id) {
        setJadwalFormData((prev) => ({ ...prev, gedung_id: res.gedung[0].id }));
      }
    } catch (err) {
      setProfileError(err.message || 'Gagal memuat profil dosen.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // ── 2. Fetch Jadwal Mengajar ──────────────────────────────────────────────
  const fetchJadwal = async () => {
    try {
      setLoadingJadwal(true);
      setJadwalError('');
      const res = await apiJson('/api/app-dosen/jadwal');
      setJadwalList(res.semua_jadwal || res.data || []);
    } catch (err) {
      setJadwalError(err.message || 'Gagal memuat jadwal mengajar.');
    } finally {
      setLoadingJadwal(false);
    }
  };

  // ── 3. Fetch Riwayat Lokasi ───────────────────────────────────────────────
  const fetchRiwayat = async () => {
    try {
      setLoadingRiwayat(true);
      setRiwayatError('');
      const res = await apiJson('/api/app-dosen/lokasi/riwayat?limit=50');
      setRiwayatLogs(res.data || []);
    } catch (err) {
      console.error('Gagal mengambil riwayat lokasi:', err);
      setRiwayatError(err.message || 'Gagal mengambil riwayat lokasi.');
    } finally {
      setLoadingRiwayat(false);
    }
  };


  useEffect(() => {
    fetchProfile();
    fetchJadwal();
  }, []);

  useEffect(() => {
    if (activeTab === 'riwayat') {
      fetchRiwayat();
    }
  }, [activeTab]);

  // ── 4. Web Geolocation Tracker Logic ──────────────────────────────────────
  const sendLocationToServer = async (latitude, longitude, accuracy) => {
    try {
      setIsSyncingNow(true);
      const res = await apiJson('/api/app-dosen/lokasi', {
        method: 'POST',
        body: JSON.stringify({
          latitude,
          longitude,
          recorded_at: new Date().toISOString(),
        }),
      });

      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('id-ID'));
      setNearestGedung(res.gedung_terdeteksi || null);
      setTrackingStatusText('Aktif memancarkan sinyal GPS real-time');
      setGeoError('');

      // Refresh status terkini pada profil secara lokal
      if (res.status_terkini) {
        setProfile((prev) => (prev ? { ...prev, status_terkini: res.status_terkini } : prev));
      }
    } catch (err) {
      console.error('Gagal mengirim koordinat lokasi:', err);
      setGeoError(err.message || 'Gagal mengirim titik lokasi ke server.');
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleStartTracking = async () => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Peramban web (browser) ini tidak mendukung Web Geolocation API.');
      return;
    }

    try {
      // 1. Aktifkan status GPS di backend
      await apiJson('/api/app-dosen/gps', {
        method: 'PATCH',
        body: JSON.stringify({ gps_enabled: true }),
      });

      setIsTracking(true);
      setTrackingStatusText('Menginisialisasi GPS...');

      // 2. Dapatkan lokasi pertama langsung
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy, speed } = pos.coords;
          const coords = { lat: latitude, lng: longitude, accuracy, speed };
          setGeoCoords(coords);
          lastCoordsRef.current = coords;
          sendLocationToServer(latitude, longitude, accuracy);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          let msg = 'Izin lokasi ditolak atau GPS tidak aktif.';
          if (err.code === 1) msg = 'Izin akses lokasi ditolak oleh browser.';
          else if (err.code === 2) msg = 'Posisi GPS tidak tersedia.';
          else if (err.code === 3) msg = 'Waktu permintaan lokasi habis (timeout).';
          setGeoError(msg);
          handleStopTracking();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );

      // 3. Pasang continuous watchPosition
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy, speed } = pos.coords;
          const coords = { lat: latitude, lng: longitude, accuracy, speed };
          setGeoCoords(coords);
          lastCoordsRef.current = coords;
        },
        (err) => {
          console.warn('watchPosition error:', err);
        },
        { enableHighAccuracy: true, maximumAge: 5000 }
      );

      // 4. Pasang interval pengiriman berkala setiap 20 detik
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = setInterval(() => {
        if (lastCoordsRef.current) {
          sendLocationToServer(
            lastCoordsRef.current.lat,
            lastCoordsRef.current.lng,
            lastCoordsRef.current.accuracy
          );
        }
      }, 20000);
    } catch (err) {
      setGeoError(err.message || 'Gagal mengaktifkan pelacakan.');
    }
  };

  const handleStopTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    setIsTracking(false);
    setTrackingStatusText('Pelacakan nonaktif');
    setGeoCoords(null);
    lastCoordsRef.current = null;

    try {
      await apiJson('/api/app-dosen/gps', {
        method: 'PATCH',
        body: JSON.stringify({ gps_enabled: false }),
      });
      fetchProfile();
    } catch (err) {
      console.error('Gagal menonaktifkan GPS di server:', err);
    }
  };

  const handleManualSync = () => {
    if (!navigator.geolocation) return;
    setIsSyncingNow(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords;
        const coords = { lat: latitude, lng: longitude, accuracy, speed };
        setGeoCoords(coords);
        lastCoordsRef.current = coords;
        sendLocationToServer(latitude, longitude, accuracy);
      },
      (err) => {
        setGeoError('Gagal membaca titik GPS saat ini: ' + err.message);
        setIsSyncingNow(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Bersihkan watch & interval saat komponen unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  // ── 5. Jadwal Mandiri Handlers ────────────────────────────────────────────
  const handleOpenAddJadwal = () => {
    setEditingJadwal(null);
    setJadwalFormError('');
    setJadwalFormData({
      hari: 'senin',
      jam_mulai: '08:00',
      jam_selesai: '10:30',
      mata_kuliah: '',
      gedung_id: profile?.gedung?.length > 0 ? profile.gedung[0].id : '',
    });
    setIsJadwalModalOpen(true);
  };

  const handleOpenEditJadwal = (item) => {
    setEditingJadwal(item);
    setJadwalFormError('');
    setJadwalFormData({
      hari: item.hari,
      jam_mulai: item.jam_mulai ? item.jam_mulai.substring(0, 5) : '08:00',
      jam_selesai: item.jam_selesai ? item.jam_selesai.substring(0, 5) : '10:30',
      mata_kuliah: item.mata_kuliah,
      gedung_id: item.gedung_id,
    });
    setIsJadwalModalOpen(true);
  };

  const handleSaveJadwal = async (e) => {
    e.preventDefault();
    setJadwalFormError('');

    if (
      !jadwalFormData.hari ||
      !jadwalFormData.jam_mulai ||
      !jadwalFormData.jam_selesai ||
      !jadwalFormData.mata_kuliah ||
      !jadwalFormData.gedung_id
    ) {
      setJadwalFormError('Semua kolom formulir jadwal wajib diisi.');
      return;
    }

    if (jadwalFormData.jam_selesai <= jadwalFormData.jam_mulai) {
      setJadwalFormError('Jam selesai harus lebih besar dari jam mulai.');
      return;
    }

    setJadwalFormSubmitting(true);
    try {
      if (editingJadwal) {
        // PUT
        const res = await apiJson(`/api/app-dosen/jadwal/${editingJadwal.id}`, {
          method: 'PUT',
          body: JSON.stringify(jadwalFormData),
        });
        setJadwalSuccess(res.message || 'Jadwal berhasil diperbarui.');
      } else {
        // POST
        const res = await apiJson('/api/app-dosen/jadwal', {
          method: 'POST',
          body: JSON.stringify(jadwalFormData),
        });
        setJadwalSuccess(res.message || 'Jadwal berhasil ditambahkan.');
      }

      setIsJadwalModalOpen(false);
      fetchJadwal();
      setTimeout(() => setJadwalSuccess(''), 4000);
    } catch (err) {
      setJadwalFormError(err.message || 'Gagal menyimpan jadwal mengajar.');
    } finally {
      setJadwalFormSubmitting(false);
    }
  };

  const handleDeleteJadwal = async () => {
    if (!deleteJadwalTarget) return;
    setDeleteJadwalLoading(true);
    try {
      const res = await apiJson(`/api/app-dosen/jadwal/${deleteJadwalTarget.id}`, {
        method: 'DELETE',
      });
      setJadwalSuccess(res.message || 'Jadwal berhasil dihapus.');
      setDeleteJadwalTarget(null);
      fetchJadwal();
      setTimeout(() => setJadwalSuccess(''), 4000);
    } catch (err) {
      setJadwalError(err.message || 'Gagal menghapus jadwal.');
      setDeleteJadwalTarget(null);
    } finally {
      setDeleteJadwalLoading(false);
    }
  };

  // Filter jadwal berdasarkan hari
  const filteredJadwal =
    selectedDayFilter === 'semua'
      ? jadwalList
      : jadwalList.filter((j) => j.hari.toLowerCase() === selectedDayFilter);

  // Status helper
  const statusEfektif = profile?.status_terkini?.status_efektif || profile?.status_terkini?.status_type || 'tidak_diketahui';
  const statusConfig = theme.colors.status[statusEfektif] || theme.colors.status.tidak_diketahui;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.surface, position: 'relative' }}>
      {/* Ambient background glows */}
      <div
        className="animate-float-slow"
        style={{
          position: 'fixed',
          top: '-6rem',
          left: '-5rem',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          backgroundColor: 'rgba(225, 224, 255, 0.55)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        className="animate-float-reverse"
        style={{
          position: 'fixed',
          top: '30%',
          right: '-7rem',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          backgroundColor: 'rgba(233, 221, 255, 0.45)',
          filter: 'blur(110px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 10 }}>
        {/* Top Navbar Dosen */}
        <header
          style={{
            backgroundColor: theme.colors.surfaceContainerLowest,
            borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '0.85rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Brand Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: theme.borderRadius.default,
                  background: theme.gradients.primaryCta,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: theme.shadows.btnPrimary,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                  co_present
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: theme.colors.primary,
                  }}
                >
                  LECTURA
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: theme.colors.secondary,
                    display: 'block',
                    lineHeight: 1,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  PORTAL DOSEN
                </span>
              </div>
            </div>

            {/* User Profile & Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.85rem',
                  backgroundColor: theme.colors.surfaceContainerLow,
                  borderRadius: theme.borderRadius.full,
                  border: `1px solid ${theme.colors.surfaceContainer}`,
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: theme.colors.primary,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    person
                  </span>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: theme.colors.onSurface }}>
                    {profile?.nama || currentUser?.nama || 'Dosen'}
                  </div>
                  <div style={{ fontSize: '11px', color: theme.colors.onSurfaceVariant }}>
                    NIP: {profile?.nip || currentUser?.nim || '-'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                title="Ganti Password"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.85rem',
                  backgroundColor: theme.colors.surfaceContainerLow,
                  borderRadius: theme.borderRadius.full,
                  border: `1px solid ${theme.colors.surfaceContainer}`,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: theme.colors.primary,
                  fontFamily: theme.typography.fontFamily.base,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  lock_reset
                </span>
                <span>Password</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                title="Keluar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.85rem',
                  backgroundColor: theme.colors.errorContainer,
                  borderRadius: theme.borderRadius.full,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: theme.colors.error,
                  fontFamily: theme.typography.fontFamily.base,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  logout
                </span>
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.75rem 1.5rem 3rem' }}>
          {/* Header Hero Card */}
          <div
            style={{
              backgroundColor: theme.colors.surfaceContainerLowest,
              borderRadius: theme.borderRadius.xl,
              border: `1px solid ${theme.colors.surfaceContainer}`,
              boxShadow: theme.shadows.card,
              padding: '1.75rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
            }}
          >
            {/* Lecturer Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: theme.gradients.primaryCta,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  fontWeight: 800,
                  boxShadow: theme.shadows.btnPrimary,
                  flexShrink: 0,
                }}
              >
                {profile?.nama ? profile.nama.charAt(0) : 'D'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <h1 style={{ fontSize: '20px', fontWeight: 800, color: theme.colors.onSurface, margin: 0 }}>
                    {profile?.nama || 'Memuat profil dosen...'}
                  </h1>
                </div>
                <div style={{ fontSize: '13px', color: theme.colors.onSurfaceVariant, marginBottom: '0.4rem' }}>
                  NIP: {profile?.nip || '-'} &bull; {profile?.jabatan || 'Dosen'} &bull;{' '}
                  {profile?.prodi?.nama || 'Politeknik Negeri Lampung'}
                </div>
                {/* Status Terkini Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: theme.borderRadius.full,
                      backgroundColor: statusConfig.bg,
                      color: statusConfig.text,
                      fontSize: '12px',
                      fontWeight: 700,
                      border: `1px solid ${statusConfig.border}`,
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: statusConfig.dot,
                      }}
                    />
                    {statusConfig.label}
                    {profile?.status_terkini?.nama_gedung ? ` di ${profile.status_terkini.nama_gedung}` : ''}
                  </span>
                  {profile?.status_terkini?.last_updated && (
                    <span style={{ fontSize: '11px', color: theme.colors.onSurfaceVariant }}>
                      Terakhir diperbarui:{' '}
                      {new Date(profile.status_terkini.last_updated).toLocaleTimeString('id-ID')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick GPS Status Badge & Tabs Bar */}
            <div
              style={{
                display: 'flex',
                backgroundColor: theme.colors.surfaceContainerLow,
                borderRadius: theme.borderRadius.full,
                padding: '4px',
                gap: '4px',
              }}
            >
              {[
                { key: 'pelacakan', label: 'Pelacakan GPS', icon: 'my_location' },
                { key: 'jadwal', label: 'Jadwal Mengajar Saya', icon: 'event_note' },
                { key: 'riwayat', label: 'Riwayat Lokasi', icon: 'history' },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 1.1rem',
                      borderRadius: theme.borderRadius.full,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 700,
                      fontFamily: theme.typography.fontFamily.base,
                      transition: 'all 0.2s ease',
                      backgroundColor: isActive ? '#ffffff' : 'transparent',
                      color: isActive ? theme.colors.primary : theme.colors.onSurfaceVariant,
                      boxShadow: isActive ? theme.shadows.cardSm : 'none',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════
              TAB 1: PELACAKAN GPS (WEB GEOLOCATION API)
          ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'pelacakan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Geolocation Card */}
              <div
                style={{
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  borderRadius: theme.borderRadius.xl,
                  border: `1px solid ${theme.colors.surfaceContainer}`,
                  boxShadow: theme.shadows.card,
                  padding: '2rem',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '26px', color: theme.colors.primary }}>
                        satellite_alt
                      </span>
                      <h2 style={{ fontSize: '18px', fontWeight: 800, color: theme.colors.onSurface, margin: 0 }}>
                        Web Geolocation Tracker
                      </h2>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: theme.colors.onSurfaceVariant, maxWidth: '620px' }}>
                      Aktifkan pelacakan langsung melalui browser perangkat HP atau laptop Anda. Sistem akan
                      mentransmisikan koordinat GPS secara otomatis ke server LECTURA tanpa perlu aplikasi Android terpisah.
                    </p>
                  </div>

                  {/* Toggle Button */}
                  <div>
                    {isTracking ? (
                      <button
                        type="button"
                        onClick={handleStopTracking}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.85rem 1.6rem',
                          borderRadius: theme.borderRadius.full,
                          border: `1.5px solid ${theme.colors.error}`,
                          backgroundColor: theme.colors.errorContainer,
                          color: theme.colors.error,
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: theme.shadows.cardSm,
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                          location_disabled
                        </span>
                        <span>Matikan Pelacakan</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartTracking}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.85rem 1.75rem',
                          borderRadius: theme.borderRadius.full,
                          border: 'none',
                          background: theme.gradients.primaryCta,
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: theme.shadows.btnPrimary,
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                          near_me
                        </span>
                        <span>Aktifkan Pelacakan GPS</span>
                      </button>
                    )}
                  </div>
                </div>

                {geoError && (
                  <div
                    style={{
                      padding: '0.85rem 1.25rem',
                      backgroundColor: theme.colors.errorContainer,
                      color: theme.colors.onErrorContainer,
                      borderRadius: theme.borderRadius.default,
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      error
                    </span>
                    <span>{geoError}</span>
                  </div>
                )}

                {/* Tracking Radar Panel */}
                <div
                  style={{
                    backgroundColor: theme.colors.surfaceContainerLow,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.surfaceContainer}`,
                    padding: '1.5rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1.25rem',
                  }}
                >
                  {/* Status Radar Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        backgroundColor: isTracking ? '#d1fae5' : '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isTracking && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: '-4px',
                            borderRadius: '50%',
                            border: '2px solid #10b981',
                            animation: 'pulse 1.8s infinite',
                          }}
                        />
                      )}
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '26px',
                          color: isTracking ? '#059669' : '#9ca3af',
                        }}
                      >
                        {isTracking ? 'sensors' : 'sensors_off'}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: theme.colors.outline, letterSpacing: '0.04em' }}>
                        Status Pemancar
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: isTracking ? '#059669' : theme.colors.onSurfaceVariant }}>
                        {trackingStatusText}
                      </div>
                    </div>
                  </div>

                  {/* Koordinat GPS */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: theme.colors.outline, letterSpacing: '0.04em' }}>
                      Titik Koordinat
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: theme.colors.onSurface }}>
                      {geoCoords ? `${geoCoords.lat.toFixed(6)}, ${geoCoords.lng.toFixed(6)}` : 'Belum terlacak'}
                    </div>
                    {geoCoords?.accuracy && (
                      <div style={{ fontSize: '11px', color: theme.colors.onSurfaceVariant, marginTop: '2px' }}>
                        Akurasi: ± {Math.round(geoCoords.accuracy)} meter
                      </div>
                    )}
                  </div>

                  {/* Gedung Terdeteksi */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: theme.colors.outline, letterSpacing: '0.04em' }}>
                      Gedung Terdeteksi
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: theme.colors.primary }}>
                      {nearestGedung ? nearestGedung.nama_gedung : (profile?.status_terkini?.nama_gedung || 'Di luar area kampus')}
                    </div>
                    {nearestGedung && (
                      <div style={{ fontSize: '11px', color: theme.colors.onSurfaceVariant, marginTop: '2px' }}>
                        Jarak geofence: {nearestGedung.jarak_meter} m
                      </div>
                    )}
                  </div>

                  {/* Ping Terakhir & Sync Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: theme.colors.outline, letterSpacing: '0.04em' }}>
                        Sinkronisasi Terakhir
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: theme.colors.onSurface }}>
                        {lastSyncTime || '-'}
                      </div>
                    </div>

                    {isTracking && (
                      <button
                        type="button"
                        onClick={handleManualSync}
                        disabled={isSyncingNow}
                        title="Kirim koordinat lokasi sekarang"
                        style={{
                          padding: '0.5rem 0.85rem',
                          borderRadius: theme.borderRadius.full,
                          border: `1px solid ${theme.colors.primary}`,
                          backgroundColor: theme.colors.primaryFixed,
                          color: theme.colors.primary,
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: isSyncingNow ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span
                          className={`material-symbols-outlined ${isSyncingNow ? 'animate-spin' : ''}`}
                          style={{ fontSize: '16px' }}
                        >
                          refresh
                        </span>
                        <span>{isSyncingNow ? 'Sinkron...' : 'Kirim Sekarang'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Information Callout */}
                <div
                  style={{
                    marginTop: '1.5rem',
                    padding: '0.85rem 1.25rem',
                    borderRadius: theme.borderRadius.default,
                    backgroundColor: theme.colors.surfaceContainer,
                    fontSize: '12px',
                    color: theme.colors.onSurfaceVariant,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: theme.colors.primary }}>
                    info
                  </span>
                  <span>
                    Pastikan izin akses lokasi pada browser HP diizinkan (Allow Location). Untuk akurasi optimal di dalam kampus, aktifkan GPS dan Wi-Fi pada perangkat Anda.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              TAB 2: MANAJEMEN JADWAL MENGAJAR MANDIRI
          ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'jadwal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Header card for Jadwal */}
              <div
                style={{
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  borderRadius: theme.borderRadius.xl,
                  border: `1px solid ${theme.colors.surfaceContainer}`,
                  boxShadow: theme.shadows.card,
                  padding: '1.5rem 1.75rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '26px', color: theme.colors.primary }}>
                      event_note
                    </span>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: theme.colors.onSurface, margin: 0 }}>
                      Manajemen Jadwal Mengajar Mandiri
                    </h2>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: theme.colors.onSurfaceVariant }}>
                    Kelola, tambah, perbarui, atau hapus jadwal perkuliahan Anda saat terjadi perubahan jadwal semester
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddJadwal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.4rem',
                    borderRadius: theme.borderRadius.full,
                    border: 'none',
                    background: theme.gradients.primaryCta,
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: theme.shadows.btnPrimary,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    add
                  </span>
                  <span>Tambah Jadwal Baru</span>
                </button>
              </div>

              {/* Feedback messages */}
              {jadwalSuccess && (
                <div
                  style={{
                    padding: '0.85rem 1.25rem',
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    borderRadius: theme.borderRadius.default,
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    check_circle
                  </span>
                  <span>{jadwalSuccess}</span>
                </div>
              )}

              {jadwalError && (
                <div
                  style={{
                    padding: '0.85rem 1.25rem',
                    backgroundColor: theme.colors.errorContainer,
                    color: theme.colors.onErrorContainer,
                    borderRadius: theme.borderRadius.default,
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    error
                  </span>
                  <span>{jadwalError}</span>
                </div>
              )}

              {/* Day Filter Pills */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  borderRadius: theme.borderRadius.full,
                  padding: '4px',
                  border: `1px solid ${theme.colors.surfaceContainer}`,
                  boxShadow: theme.shadows.cardSm,
                  gap: '4px',
                  width: 'fit-content',
                }}
              >
                {[
                  { key: 'semua', label: 'Semua Hari' },
                  { key: 'senin', label: 'Senin' },
                  { key: 'selasa', label: 'Selasa' },
                  { key: 'rabu', label: 'Rabu' },
                  { key: 'kamis', label: 'Kamis' },
                  { key: 'jumat', label: 'Jumat' },
                  { key: 'sabtu', label: 'Sabtu' },
                  { key: 'minggu', label: 'Minggu' },
                ].map((d) => {
                  const isActive = selectedDayFilter === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setSelectedDayFilter(d.key)}
                      style={{
                        padding: '0.45rem 1rem',
                        borderRadius: theme.borderRadius.full,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 700,
                        backgroundColor: isActive ? theme.colors.primary : 'transparent',
                        color: isActive ? '#ffffff' : theme.colors.onSurfaceVariant,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>

              {/* Jadwal Cards / Table */}
              <div
                style={{
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  borderRadius: theme.borderRadius.xl,
                  border: `1px solid ${theme.colors.surfaceContainer}`,
                  boxShadow: theme.shadows.cardSm,
                  overflow: 'hidden',
                }}
              >
                {loadingJadwal ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '32px', color: theme.colors.primary }}>
                      progress_activity
                    </span>
                    <p style={{ marginTop: '0.75rem', fontSize: '14px' }}>Memuat jadwal mengajar...</p>
                  </div>
                ) : filteredJadwal.length === 0 ? (
                  <div style={{ padding: '3.5rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: theme.colors.outline }}>
                      event_busy
                    </span>
                    <h3 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '16px', color: theme.colors.onSurface }}>
                      Tidak ada jadwal mengajar
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      {selectedDayFilter === 'semua'
                        ? 'Anda belum memiliki jadwal mengajar terdaftar. Klik "Tambah Jadwal Baru" untuk menambahkan.'
                        : `Tidak ada jadwal mengajar untuk hari ${selectedDayFilter.toUpperCase()}.`}
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                      <thead>
                        <tr
                          style={{
                            backgroundColor: theme.colors.surfaceContainerLow,
                            borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
                            color: theme.colors.onSurfaceVariant,
                            fontSize: '12px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          <th style={{ padding: '1rem 1.25rem' }}>Hari</th>
                          <th style={{ padding: '1rem 1.25rem' }}>Jam Perkuliahan</th>
                          <th style={{ padding: '1rem 1.25rem' }}>Mata Kuliah</th>
                          <th style={{ padding: '1rem 1.25rem' }}>Lokasi Gedung</th>
                          <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredJadwal.map((item) => (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.colors.surfaceContainerLow)}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <td style={{ padding: '0.9rem 1.25rem' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: theme.borderRadius.sm,
                                  backgroundColor: theme.colors.primaryFixed,
                                  color: theme.colors.primary,
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {item.hari}
                              </span>
                            </td>
                            <td style={{ padding: '0.9rem 1.25rem', fontFamily: 'monospace', fontWeight: 700, color: theme.colors.onSurface }}>
                              {item.jam_mulai ? item.jam_mulai.substring(0, 5) : '-'} -{' '}
                              {item.jam_selesai ? item.jam_selesai.substring(0, 5) : '-'} WIB
                            </td>
                            <td style={{ padding: '0.9rem 1.25rem', fontWeight: 700, color: theme.colors.onSurface }}>
                              {item.mata_kuliah}
                            </td>
                            <td style={{ padding: '0.9rem 1.25rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: theme.colors.onSurfaceVariant }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: theme.colors.primary }}>
                                  location_city
                                </span>
                                <span>{item.nama_gedung || 'Gedung tidak terdata'}</span>
                              </div>
                            </td>
                            <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditJadwal(item)}
                                  title="Edit jadwal"
                                  style={{
                                    padding: '6px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: theme.colors.primary,
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                                    edit
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteJadwalTarget(item)}
                                  title="Hapus jadwal"
                                  style={{
                                    padding: '6px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: theme.colors.error,
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                                    delete
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              TAB 3: RIWAYAT LOKASI
          ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'riwayat' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div
                style={{
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  borderRadius: theme.borderRadius.xl,
                  border: `1px solid ${theme.colors.surfaceContainer}`,
                  boxShadow: theme.shadows.card,
                  padding: '1.5rem 1.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '26px', color: theme.colors.primary }}>
                      history
                    </span>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: theme.colors.onSurface, margin: 0 }}>
                      Riwayat Log Sinyal GPS
                    </h2>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: theme.colors.onSurfaceVariant }}>
                    Daftar log transmisi koordinat lokasi Anda yang tersimpan di server
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchRiwayat}
                  disabled={loadingRiwayat}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.1rem',
                    borderRadius: theme.borderRadius.full,
                    border: `1px solid ${theme.colors.surfaceContainer}`,
                    backgroundColor: theme.colors.surfaceContainerLow,
                    fontSize: '13px',
                    fontWeight: 700,
                    color: theme.colors.primary,
                    cursor: 'pointer',
                  }}
                >
                  <span className={`material-symbols-outlined ${loadingRiwayat ? 'animate-spin' : ''}`} style={{ fontSize: '17px' }}>
                    refresh
                  </span>
                  <span>Segarkan Log</span>
                </button>
              </div>

              {/* Riwayat Error Banner */}
              {riwayatError && (
                <div
                  style={{
                    padding: '0.85rem 1.25rem',
                    backgroundColor: theme.colors.errorContainer,
                    color: theme.colors.onErrorContainer,
                    borderRadius: theme.borderRadius.default,
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    error
                  </span>
                  <span>{riwayatError}</span>
                </div>
              )}

              {/* Log Table */}
              <div
                style={{
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  borderRadius: theme.borderRadius.xl,
                  border: `1px solid ${theme.colors.surfaceContainer}`,
                  boxShadow: theme.shadows.cardSm,
                  overflow: 'hidden',
                }}
              >
                {loadingRiwayat ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '32px', color: theme.colors.primary }}>
                      progress_activity
                    </span>
                    <p style={{ marginTop: '0.75rem', fontSize: '14px' }}>Memuat riwayat log lokasi...</p>
                  </div>
                ) : riwayatLogs.length === 0 ? (
                  <div style={{ padding: '3.5rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: theme.colors.outline }}>
                      location_off
                    </span>
                    <h3 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '16px', color: theme.colors.onSurface }}>
                      Belum ada log lokasi
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      Aktifkan tombol Pelacakan GPS di tab "Pelacakan GPS" untuk mulai memancarkan lokasi.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                      <thead>
                        <tr
                          style={{
                            backgroundColor: theme.colors.surfaceContainerLow,
                            borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
                            color: theme.colors.onSurfaceVariant,
                            fontSize: '12px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          <th style={{ padding: '1rem 1.25rem' }}>Waktu Log</th>
                          <th style={{ padding: '1rem 1.25rem' }}>Koordinat (Lat, Lng)</th>
                          <th style={{ padding: '1rem 1.25rem' }}>Gedung Terdeteksi</th>
                          <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riwayatLogs.map((log) => (
                          <tr
                            key={log.log_id || log.id}
                            style={{
                              borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <td style={{ padding: '0.85rem 1.25rem', color: theme.colors.onSurface, fontWeight: 600 }}>
                              {log.waktu_log
                                ? new Date(log.waktu_log).toLocaleString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })
                                : '-'}
                            </td>
                            <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'monospace', fontSize: '13px' }}>
                              {log.latitude != null ? Number(log.latitude).toFixed(6) : '-'},{' '}
                              {log.longitude != null ? Number(log.longitude).toFixed(6) : '-'}
                            </td>
                            <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: theme.colors.primary }}>
                              {log.nama_gedung || 'Di luar area gedung'}
                            </td>

                            <td style={{ padding: '0.85rem 1.25rem' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.2rem 0.65rem',
                                  borderRadius: theme.borderRadius.full,
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: log.status_type === 'realtime' ? '#d1fae5' : '#e5e7eb',
                                  color: log.status_type === 'realtime' ? '#065f46' : '#374151',
                                }}
                              >
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: log.status_type === 'realtime' ? '#10b981' : '#6b7280',
                                  }}
                                />
                                {log.status_type === 'realtime' ? 'Real-time' : 'Histori'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          MODAL TAMBAH / EDIT JADWAL MENGAJAR
      ═════════════════════════════════════════════════════════════════════ */}
      {isJadwalModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 28, 45, 0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !jadwalFormSubmitting) setIsJadwalModalOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: theme.colors.surfaceContainerLowest,
              borderRadius: theme.borderRadius.xl,
              boxShadow: theme.shadows.cardElevated,
              border: `1px solid ${theme.colors.surfaceContainer}`,
              overflow: 'hidden',
              animation: 'fadeInUp 0.2s ease-out',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: theme.colors.primaryFixed,
                    color: theme.colors.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {editingJadwal ? 'edit_calendar' : 'add_circle'}
                  </span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: theme.colors.onSurface }}>
                    {editingJadwal ? 'Edit Jadwal Mengajar' : 'Tambah Jadwal Mengajar'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: theme.colors.onSurfaceVariant }}>
                    {editingJadwal ? 'Perbarui data mata kuliah & waktu' : 'Atur jadwal perkuliahan mandiri Anda'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !jadwalFormSubmitting && setIsJadwalModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.outline,
                  padding: '4px',
                  borderRadius: '50%',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  close
                </span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveJadwal} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {jadwalFormError && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: theme.colors.errorContainer,
                    color: theme.colors.onErrorContainer,
                    borderRadius: theme.borderRadius.default,
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    error
                  </span>
                  <span>{jadwalFormError}</span>
                </div>
              )}

              {/* Mata Kuliah */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Mata Kuliah *
                </label>
                <input
                  type="text"
                  value={jadwalFormData.mata_kuliah}
                  onChange={(e) => setJadwalFormData((p) => ({ ...p, mata_kuliah: e.target.value }))}
                  placeholder="Contoh: Basis Data Lanjut (Kelas 3A)"
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: theme.borderRadius.default,
                    border: `1px solid ${theme.colors.outlineVariant}`,
                    backgroundColor: theme.colors.surfaceContainerLow,
                    fontSize: '13px',
                    color: theme.colors.onSurface,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Hari & Gedung */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Hari *
                  </label>
                  <select
                    value={jadwalFormData.hari}
                    onChange={(e) => setJadwalFormData((p) => ({ ...p, hari: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: theme.borderRadius.default,
                      border: `1px solid ${theme.colors.outlineVariant}`,
                      backgroundColor: theme.colors.surfaceContainerLow,
                      fontSize: '13px',
                      color: theme.colors.onSurface,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  >
                    {['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'].map((h) => (
                      <option key={h} value={h}>
                        {h.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Lokasi Gedung *
                  </label>
                  <select
                    value={jadwalFormData.gedung_id}
                    onChange={(e) => setJadwalFormData((p) => ({ ...p, gedung_id: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: theme.borderRadius.default,
                      border: `1px solid ${theme.colors.outlineVariant}`,
                      backgroundColor: theme.colors.surfaceContainerLow,
                      fontSize: '13px',
                      color: theme.colors.onSurface,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  >
                    {profile?.gedung?.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama_gedung}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Jam Mulai & Jam Selesai */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Jam Mulai (HH:MM) *
                  </label>
                  <input
                    type="time"
                    value={jadwalFormData.jam_mulai}
                    onChange={(e) => setJadwalFormData((p) => ({ ...p, jam_mulai: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: theme.borderRadius.default,
                      border: `1px solid ${theme.colors.outlineVariant}`,
                      backgroundColor: theme.colors.surfaceContainerLow,
                      fontSize: '13px',
                      color: theme.colors.onSurface,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Jam Selesai (HH:MM) *
                  </label>
                  <input
                    type="time"
                    value={jadwalFormData.jam_selesai}
                    onChange={(e) => setJadwalFormData((p) => ({ ...p, jam_selesai: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: theme.borderRadius.default,
                      border: `1px solid ${theme.colors.outlineVariant}`,
                      backgroundColor: theme.colors.surfaceContainerLow,
                      fontSize: '13px',
                      color: theme.colors.onSurface,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsJadwalModalOpen(false)}
                  disabled={jadwalFormSubmitting}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: theme.borderRadius.default,
                    border: `1px solid ${theme.colors.outlineVariant}`,
                    backgroundColor: 'transparent',
                    color: theme.colors.onSurfaceVariant,
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={jadwalFormSubmitting}
                  style={{
                    flex: 1.5,
                    padding: '0.75rem',
                    borderRadius: theme.borderRadius.default,
                    border: 'none',
                    background: theme.gradients.primaryCta,
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: jadwalFormSubmitting ? 'not-allowed' : 'pointer',
                    opacity: jadwalFormSubmitting ? 0.7 : 1,
                    boxShadow: theme.shadows.btnPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {jadwalFormSubmitting ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        check
                      </span>
                      <span>{editingJadwal ? 'Simpan Perubahan' : 'Tambahkan'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          MODAL KONFIRMASI HAPUS JADWAL
      ═════════════════════════════════════════════════════════════════════ */}
      {deleteJadwalTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 28, 45, 0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: theme.colors.surfaceContainerLowest,
              borderRadius: theme.borderRadius.xl,
              boxShadow: theme.shadows.cardElevated,
              padding: '1.75rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: theme.colors.errorContainer,
                color: theme.colors.error,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                delete_forever
              </span>
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '18px', fontWeight: 800, color: theme.colors.onSurface }}>
              Hapus Jadwal Mengajar?
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '14px', color: theme.colors.onSurfaceVariant }}>
              Apakah Anda yakin ingin menghapus jadwal mata kuliah{' '}
              <strong>"{deleteJadwalTarget.mata_kuliah}"</strong> pada hari{' '}
              <strong>{deleteJadwalTarget.hari?.toUpperCase()}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDeleteJadwalTarget(null)}
                disabled={deleteJadwalLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: theme.borderRadius.default,
                  border: `1px solid ${theme.colors.outlineVariant}`,
                  backgroundColor: 'transparent',
                  color: theme.colors.onSurfaceVariant,
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteJadwal}
                disabled={deleteJadwalLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: theme.borderRadius.default,
                  border: 'none',
                  backgroundColor: theme.colors.error,
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: deleteJadwalLoading ? 'not-allowed' : 'pointer',
                  opacity: deleteJadwalLoading ? 0.7 : 1,
                }}
              >
                {deleteJadwalLoading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
