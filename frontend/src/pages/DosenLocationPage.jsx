import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiJson } from '../lib/api';
import theme from '../styles/theme';
import ChangePasswordModal from '../components/ChangePasswordModal';

const LOCATION_REFRESH_MS = 30_000;
const WEEK_DAYS = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
const DAY_LABELS = {
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
  minggu: 'Minggu',
};

function readCurrentPosition() {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('Browser ini tidak mendukung akses lokasi.'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
      (error) => {
        const messages = {
          1: 'Izin lokasi ditolak. Izinkan akses lokasi di pengaturan browser untuk berbagi.',
          2: 'Lokasi perangkat tidak tersedia. Periksa GPS atau koneksi perangkat.',
          3: 'Permintaan lokasi melewati batas waktu. Coba lagi.',
        };
        reject(new Error(messages[error.code] || 'Gagal membaca lokasi perangkat.'));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 }
    );
  });
}

export default function DosenLocationPage({ user, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState('');
  const [availabilityHours, setAvailabilityHours] = useState('2');
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastSent, setLastSent] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const timerRef = useRef(null);
  const sendingRef = useRef(false);

  const sendPosition = useCallback(async (position) => {
    await apiJson('/api/app-dosen/lokasi', {
      method: 'POST',
      body: JSON.stringify(position),
    });
    setLastSent(new Date());
    setError('');
  }, []);

  const sendCurrentPosition = useCallback(async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      const position = await readCurrentPosition();
      await sendPosition(position);
    } catch (err) {
      setError(err.message || 'Gagal mengirim lokasi.');
    } finally {
      sendingRef.current = false;
    }
  }, [sendPosition]);

  const startRefresh = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(sendCurrentPosition, LOCATION_REFRESH_MS);
  }, [sendCurrentPosition]);

  useEffect(() => {
    let active = true;
    apiJson('/api/app-dosen/me')
      .then((result) => {
        if (!active) return;
        setProfile(result.data);
        apiJson('/api/app-dosen/jadwal')
          .then((scheduleResult) => {
            if (active) setSchedule(scheduleResult.semua_jadwal || []);
          })
          .catch((err) => {
            if (active) setScheduleError(err.message || 'Gagal memuat jadwal.');
          })
          .finally(() => {
            if (active) setScheduleLoading(false);
          });
        if (result.data?.gps_enabled) {
          setSharing(true);
          startRefresh();
          sendCurrentPosition();
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Gagal memuat profil dosen.');
          setScheduleError(err.message || 'Jadwal tidak dapat dimuat.');
          setScheduleLoading(false);
        }
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });

    return () => {
      active = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [sendCurrentPosition, startRefresh]);

  const updateAvailability = async (status) => {
    setAvailabilityBusy(true);
    setError('');
    try {
      const result = await apiJson('/api/app-dosen/ketersediaan', {
        method: 'PATCH',
        body: JSON.stringify({
          status_ketersediaan: status,
          durasi_jam: status === 'tersedia' ? Number(availabilityHours) : undefined,
        }),
      });
      setProfile((current) => ({
        ...current,
        status_ketersediaan: result.data.status_ketersediaan,
        ketersediaan_sampai: result.data.ketersediaan_sampai,
      }));
    } catch (err) {
      setError(err.message || 'Gagal memperbarui status ketersediaan.');
    } finally {
      setAvailabilityBusy(false);
    }
  };

  const enableSharing = async () => {
    setBusy(true);
    setError('');
    try {
      const position = await readCurrentPosition();
      await apiJson('/api/app-dosen/gps', {
        method: 'PATCH',
        body: JSON.stringify({ gps_enabled: true }),
      });
      setSharing(true);
      await sendPosition(position);
      startRefresh();
    } catch (err) {
      setError(err.message || 'Gagal mengaktifkan berbagi lokasi.');
      try {
        await apiJson('/api/app-dosen/gps', {
          method: 'PATCH',
          body: JSON.stringify({ gps_enabled: false }),
        });
      } catch (revokeError) {
        console.error('Failed to revoke GPS sharing after start failure:', revokeError);
      }
      setSharing(false);
    } finally {
      setBusy(false);
    }
  };

  const disableSharing = async () => {
    setBusy(true);
    setError('');
    try {
      await apiJson('/api/app-dosen/gps', {
        method: 'PATCH',
        body: JSON.stringify({ gps_enabled: false }),
      });
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      setSharing(false);
      setLastSent(null);
    } catch (err) {
      setError(err.message || 'Gagal menonaktifkan berbagi lokasi.');
    } finally {
      setBusy(false);
    }
  };

  const buttonStyle = {
    border: 'none',
    borderRadius: theme.borderRadius.full,
    padding: '0.75rem 1.25rem',
    color: '#fff',
    background: sharing ? '#ba1a1a' : theme.gradients.primaryCta,
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: theme.typography.fontFamily.base,
    cursor: busy || loadingProfile ? 'wait' : 'pointer',
    opacity: busy || loadingProfile ? 0.7 : 1,
  };
  const available = profile?.status_ketersediaan === 'tersedia';

  return (
    <main style={{
      minHeight: '100vh',
      padding: '1.25rem clamp(1rem, 4vw, 2.5rem) 3rem',
      boxSizing: 'border-box',
      background: 'linear-gradient(145deg, #f6f7ff 0%, #fbfbff 50%, #f1f4ff 100%)',
      color: theme.colors.onSurface,
      fontFamily: theme.typography.fontFamily.base,
    }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', padding: '0.25rem 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '14px',
              background: theme.gradients.primaryCta, color: '#fff',
              display: 'grid', placeItems: 'center', boxShadow: theme.shadows.btnPrimary,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '23px' }}>school</span>
            </div>
            <div>
              <strong style={{ color: theme.colors.primary, fontSize: '17px', letterSpacing: '0.02em' }}>LECTURA</strong>
              <div style={{ fontSize: '12px', color: theme.colors.onSurfaceVariant }}>PORTAL DOSEN</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button type="button" onClick={() => setShowPasswordModal(true)} style={{
              border: `1px solid ${theme.colors.outlineVariant}`,
              borderRadius: theme.borderRadius.full, padding: '0.6rem 1rem',
              background: '#fff', color: theme.colors.primary, cursor: 'pointer',
              fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            }}><span className="material-symbols-outlined" style={{ fontSize: '17px' }}>key</span>Ubah Password</button>
            <button type="button" onClick={onLogout} style={{
              border: `1px solid ${theme.colors.outlineVariant}`,
              borderRadius: theme.borderRadius.full, padding: '0.6rem 1rem',
              background: '#fff', color: theme.colors.onSurface, cursor: 'pointer',
              fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            }}><span className="material-symbols-outlined" style={{ fontSize: '17px' }}>logout</span>Keluar</button>
          </div>
        </header>

        <section style={{
          position: 'relative',
          overflow: 'hidden',
          padding: 'clamp(1.5rem, 4vw, 2.25rem)',
          marginBottom: '1.1rem',
          background: 'linear-gradient(115deg, #22266f 0%, #4648d4 58%, #7048d8 100%)',
          borderRadius: '26px',
          color: '#fff',
          boxShadow: '0 18px 40px rgba(50, 51, 150, 0.22)',
        }}>
          <div style={{
            position: 'absolute', right: '-55px', top: '-135px', width: '330px', height: '330px',
            borderRadius: '50%', border: '1px solid rgba(255,255,255,0.16)',
            boxShadow: '0 0 0 35px rgba(255,255,255,0.035), 0 0 0 75px rgba(255,255,255,0.025)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1.1rem', flexWrap: 'wrap' }}>
            <div style={{
              width: '72px', height: '72px', flexShrink: 0, borderRadius: '23px',
              display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.24)', fontSize: '30px', fontWeight: 800,
            }}>
              {(profile?.nama || user?.nama || 'D').trim().charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: '1 1 260px' }}>
              <div style={{ fontSize: '12px', letterSpacing: '0.12em', opacity: 0.8, marginBottom: '0.3rem' }}>DASHBOARD DOSEN</div>
              <h1 style={{ margin: '0 0 0.35rem', fontSize: 'clamp(22px, 3vw, 30px)', lineHeight: 1.25 }}>
                Halo, {profile?.nama || user?.nama || 'Dosen'}
              </h1>
              <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: '14px' }}>
                {profile?.prodi?.nama || 'Kelola jadwal dan informasi ketersediaan Anda'}
                {profile?.nip ? ` · NIP ${profile.nip}` : ''}
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.9rem',
              borderRadius: theme.borderRadius.full, background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.2)', fontSize: '13px', fontWeight: 700,
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: available ? '#6ee7b7' : '#c4c5d8' }} />
              {available ? 'Tersedia' : 'Tidak tersedia'}
            </div>
          </div>
          <p style={{ position: 'relative', margin: '1.25rem 0 0', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, maxWidth: '760px' }}>
            Kelola berbagi lokasi dan status ketersediaan Anda. Lokasi presisi hanya dibagikan kepada mahasiswa yang sudah login setelah Anda menyetujuinya.
          </p>
        </section>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
          gap: '1rem',
          alignItems: 'stretch',
        }}>
        <section style={{
          padding: '1.5rem',
          backgroundColor: 'rgba(255,255,255,0.94)',
          border: `1px solid ${theme.colors.surfaceContainer}`,
          borderRadius: '22px',
          boxShadow: theme.shadows.cardSm,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.45rem' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: '#e8eaff', color: theme.colors.primary }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>my_location</span>
            </span>
            <h2 style={{ margin: 0, fontSize: '19px' }}>Berbagi Lokasi</h2>
          </div>
          <p style={{ margin: '0 0 1rem', color: theme.colors.onSurfaceVariant, lineHeight: 1.55, fontSize: '14px' }}>
            Saat aktif, perangkat mengirim lokasi terbaru setiap 30 detik selama halaman ini terbuka.
          </p>
          {error && (
            <div role="alert" style={{
              marginBottom: '1rem', padding: '0.75rem 0.9rem',
              backgroundColor: theme.colors.errorContainer,
              color: theme.colors.onErrorContainer,
              borderRadius: '14px',
            }}>{error}</div>
          )}

          <div style={{
            padding: '1rem 1.1rem',
            marginBottom: '1rem',
            borderRadius: '16px',
            background: sharing ? 'linear-gradient(110deg, #e7fbf2, #f0fdf7)' : theme.colors.surfaceContainerLow,
            color: sharing ? '#065f46' : theme.colors.onSurfaceVariant,
          }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>{sharing ? 'location_on' : 'location_off'}</span>
              {loadingProfile ? 'Memeriksa status...' : sharing ? 'Berbagi lokasi aktif' : 'Lokasi tidak dibagikan'}
            </strong>
            {lastSent && (
              <div style={{ marginTop: '0.35rem', marginLeft: '1.55rem', fontSize: '13px' }}>
                Pengiriman terakhir: {lastSent.toLocaleTimeString('id-ID')}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={busy || loadingProfile}
            onClick={sharing ? disableSharing : enableSharing}
            style={{ ...buttonStyle, width: '100%', boxShadow: sharing ? 'none' : theme.shadows.btnPrimary }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '0.4rem' }}>
              {sharing ? 'pause_circle' : 'near_me'}
            </span>
            {busy ? 'Memproses...' : sharing ? 'Hentikan Berbagi Lokasi' : 'Izinkan & Mulai Berbagi Lokasi'}
          </button>
        </section>

        <section style={{
          padding: '1.5rem',
          backgroundColor: 'rgba(255,255,255,0.94)',
          border: `1px solid ${theme.colors.surfaceContainer}`,
          borderRadius: '22px',
          boxShadow: theme.shadows.cardSm,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.45rem' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: '#e9ddff', color: theme.colors.secondary }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>event_available</span>
            </span>
            <h2 style={{ margin: 0, fontSize: '19px' }}>Status Ketersediaan</h2>
          </div>
          <p style={{ margin: '0 0 1rem', color: theme.colors.onSurfaceVariant, lineHeight: 1.55, fontSize: '14px' }}>
            Beri tahu mahasiswa jika Anda bisa ditemui. Pengaturan ini terpisah dari GPS.
          </p>
          <div style={{
            padding: '0.9rem 1rem',
            marginBottom: '1rem',
            borderRadius: '16px',
            background: available ? 'linear-gradient(110deg, #e7fbf2, #f0fdf7)' : theme.colors.surfaceContainerLow,
            color: available ? '#065f46' : theme.colors.onSurfaceVariant,
          }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>{available ? 'check_circle' : 'do_not_disturb_on'}</span>
              {available ? 'Anda menyatakan tersedia' : 'Anda belum menyatakan tersedia'}
            </strong>
            {available && profile.ketersediaan_sampai && (
              <div style={{ marginTop: '0.25rem', marginLeft: '1.55rem', fontSize: '13px' }}>
                Status berakhir pukul {new Date(profile.ketersediaan_sampai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: theme.colors.onSurfaceVariant, fontSize: '13px', fontWeight: 700 }}>
              Durasi status
              <select
                value={availabilityHours}
                onChange={(event) => setAvailabilityHours(event.target.value)}
                disabled={availabilityBusy}
                style={{
                  padding: '0.55rem 0.7rem',
                  border: `1px solid ${theme.colors.outlineVariant}`,
                  borderRadius: '12px',
                  backgroundColor: '#fff',
                  color: theme.colors.onSurface,
                  font: 'inherit',
                }}
              >
                {[1, 2, 4, 8, 12].map((hours) => <option key={hours} value={hours}>{hours} jam</option>)}
              </select>
            </label>
            <button type="button" disabled={availabilityBusy || loadingProfile} onClick={() => updateAvailability('tersedia')} style={{
              ...buttonStyle,
              boxShadow: theme.shadows.btnPrimary,
              background: theme.gradients.primaryCta,
              cursor: availabilityBusy || loadingProfile ? 'wait' : 'pointer',
            }}>{availabilityBusy ? 'Menyimpan...' : available ? 'Perbarui Status' : 'Saya Tersedia'}</button>
            {profile?.status_ketersediaan === 'tersedia' && (
              <button type="button" disabled={availabilityBusy} onClick={() => updateAvailability('tidak_tersedia')} style={{
                ...buttonStyle,
                background: '#5f6368',
                cursor: availabilityBusy ? 'wait' : 'pointer',
              }}>Tandai Tidak Tersedia</button>
            )}
          </div>
        </section>
        </div>

        <section style={{
          marginTop: '1.1rem',
          padding: '1.5rem',
          backgroundColor: 'rgba(255,255,255,0.94)',
          border: `1px solid ${theme.colors.surfaceContainer}`,
          borderRadius: '22px',
          boxShadow: theme.shadows.cardSm,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <span style={{ width: '36px', height: '36px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: '#e3f4ff', color: '#006387' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>calendar_month</span>
                </span>
                <h2 style={{ margin: 0, fontSize: '19px' }}>Jadwal Mengajar Saya</h2>
              </div>
              <p style={{ margin: 0, color: theme.colors.onSurfaceVariant, lineHeight: 1.5, fontSize: '14px' }}>
                Jadwal resmi dikelola admin. Hubungi admin kampus jika ada perubahan.
              </p>
            </div>
            {!scheduleLoading && !scheduleError && schedule.length > 0 && (
              <span style={{
                padding: '0.4rem 0.7rem', borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.surfaceContainerLow, color: theme.colors.primary,
                fontSize: '12px', fontWeight: 700,
              }}>{schedule.length} kelas terjadwal</span>
            )}
          </div>
          {scheduleLoading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
              <span className="material-symbols-outlined" style={{ fontSize: '25px', color: theme.colors.primary }}>progress_activity</span>
              <div>Memuat jadwal...</div>
            </div>
          ) : scheduleError ? (
            <div role="alert" style={{
              padding: '0.85rem 1rem', borderRadius: '14px',
              color: theme.colors.onErrorContainer, background: theme.colors.errorContainer,
            }}>{scheduleError}</div>
          ) : schedule.length === 0 ? (
            <div style={{
              display: 'grid', justifyItems: 'center', gap: '0.45rem',
              padding: '2rem 1rem', textAlign: 'center',
              borderRadius: '18px', background: theme.colors.surfaceContainerLow,
              color: theme.colors.onSurfaceVariant,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: theme.colors.primary }}>event_busy</span>
              <strong style={{ color: theme.colors.onSurface }}>Belum ada jadwal mengajar</strong>
              <span style={{ fontSize: '13px' }}>Jadwal akan tampil di sini setelah ditambahkan admin.</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '0.75rem' }}>
              {WEEK_DAYS.filter((day) => schedule.some((item) => item.hari === day)).map((day) => (
                <div key={day} style={{
                  overflow: 'hidden',
                  border: `1px solid ${theme.colors.surfaceContainer}`,
                  borderRadius: '17px',
                  background: '#fff',
                }}>
                  <strong style={{
                    display: 'block', padding: '0.65rem 0.85rem',
                    background: theme.colors.surfaceContainerLow, color: theme.colors.primary,
                    fontSize: '13px',
                  }}>
                    {DAY_LABELS[day]}
                  </strong>
                  <div style={{ display: 'grid', gap: '0.65rem', padding: '0.75rem' }}>
                    {schedule.filter((item) => item.hari === day).map((item) => (
                      <div key={item.id} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
                        <span style={{
                          minWidth: '94px', padding: '0.48rem 0.55rem',
                          borderRadius: '11px', background: '#f1f2ff',
                          color: theme.colors.primary, textAlign: 'center',
                          fontSize: '12px', fontWeight: 800,
                        }}>
                          {String(item.jam_mulai).slice(0, 5)}–{String(item.jam_selesai).slice(0, 5)}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <strong style={{ display: 'block', fontSize: '13px', lineHeight: 1.45 }}>{item.mata_kuliah}</strong>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', color: theme.colors.onSurfaceVariant, fontSize: '12px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>location_on</span>
                            {item.nama_gedung}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </main>
  );
}
