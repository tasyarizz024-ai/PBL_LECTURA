import React, { useState, useEffect } from 'react';
import { apiJson } from '../lib/api';
import theme from '../styles/theme';
import GedungStaticMap from './GedungStaticMap';

export default function LecturerDetailModal({ lecturerId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWeekly, setShowWeekly] = useState(false);

  useEffect(() => {
    if (!lecturerId) return;

    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiJson(`/api/pencarian-dosen/${lecturerId}`);
        if (isMounted) {
          if (result.success) {
            setDetail(result.data);
          } else {
            setError(result.message || 'Gagal memuat detail dosen');
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [lecturerId]);

  if (!lecturerId) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 28, 45, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderRadius: theme.borderRadius.xl,
          boxShadow: theme.shadows.card,
          border: `1px solid ${theme.colors.surfaceContainer}`,
          padding: '1.75rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: theme.colors.surfaceContainerLow,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: theme.colors.onSurfaceVariant,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            close
          </span>
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: theme.colors.onSurfaceVariant }}>
            <span className="material-symbols-outlined animate-spin" style={{ fontSize: '32px', color: theme.colors.primary }}>
              progress_activity
            </span>
            <p style={{ marginTop: '0.75rem', fontSize: '16px' }}>Memuat informasi dosen...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ color: theme.colors.error, fontWeight: 600 }}>{error}</p>
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: theme.colors.surfaceContainerHigh,
                border: 'none',
                borderRadius: theme.borderRadius.full,
                cursor: 'pointer',
              }}
            >
              Tutup
            </button>
          </div>
        ) : detail ? (
          <div>
            {/* Header: Profil Dosen */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: theme.colors.surfaceContainerLow,
                  border: `2px solid ${theme.colors.surfaceContainerHigh}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  color: theme.colors.primary,
                  flexShrink: 0,
                }}
              >
                {detail.foto ? (
                  <img src={detail.foto} alt={detail.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>
                    person
                  </span>
                )}
              </div>

              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: theme.colors.onSurface, margin: 0 }}>
                  {detail.nama}
                </h2>
                <div style={{ fontSize: '16px', fontWeight: 600, color: theme.colors.primary, marginTop: '2px' }}>
                  {detail.prodi?.nama} {detail.jurusan?.nama ? `• ${detail.jurusan.nama}` : ''}
                </div>
                <div style={{ fontSize: '16px', color: theme.colors.onSurfaceVariant, marginTop: '2px' }}>
                  NIP: {detail.nip} | {detail.jabatan || 'Dosen Pengajar'}
                </div>
              </div>
            </div>

            {/* Status Card Utama */}
            <div
              style={{
                backgroundColor: theme.colors.surfaceContainerLow,
                borderRadius: theme.borderRadius.default,
                padding: '1.25rem',
                border: `1px solid ${theme.colors.surfaceContainer}`,
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', color: theme.colors.onSurfaceVariant, letterSpacing: '0.04em' }}>
                  Status Ketersediaan
                </span>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: theme.borderRadius.full,
                    backgroundColor:
                      detail.status_terkini?.status_type === 'realtime'
                        ? theme.colors.status.realtime.bg
                        : detail.status_terkini?.status_type === 'prediksi'
                        ? theme.colors.status.prediksi.bg
                        : theme.colors.status.tidak_diketahui.bg,
                    color:
                      detail.status_terkini?.status_type === 'realtime'
                        ? theme.colors.status.realtime.text
                        : detail.status_terkini?.status_type === 'prediksi'
                        ? theme.colors.status.prediksi.text
                        : theme.colors.status.tidak_diketahui.text,
                    fontSize: '16px',
                    fontWeight: 700,
                  }}
                >
                  {detail.status_terkini?.badge?.label || 'Tidak diketahui'}
                  {detail.status_terkini?.probabilitas ? ` (${Math.round(detail.status_terkini.probabilitas)}%)` : ''}
                </span>
              </div>

              {/* Lokasi Gedung */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: theme.borderRadius.sm,
                    backgroundColor: theme.colors.surfaceContainerHigh,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.colors.primary,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    location_on
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurface }}>
                    {detail.status_terkini?.lokasi_gedung?.nama_gedung || 'Lokasi belum terdeteksi (Off-campus)'}
                  </div>
              {/* Peta Lokasi Gedung */}
              {detail.status_terkini?.status_type === 'tidak_diketahui' || !detail.status_terkini?.lokasi_gedung?.latitude ? (
                <div style={{ marginTop: '0.75rem', fontSize: '16px', color: theme.colors.outline, fontStyle: 'italic' }}>
                  Lokasi tidak tersedia
                </div>
              ) : (
                <div style={{ marginTop: '0.75rem' }}>
                  <GedungStaticMap
                    latitude={detail.status_terkini.lokasi_gedung.latitude}
                    longitude={detail.status_terkini.lokasi_gedung.longitude}
                    namaGedung={detail.status_terkini.lokasi_gedung.nama_gedung}
                  />
                </div>
              )}
                </div>
              </div>

              {detail.status_terkini?.last_updated && (
                <div style={{ fontSize: '16px', color: theme.colors.outline, marginTop: '0.75rem', borderTop: `1px dashed ${theme.colors.outlineVariant}`, paddingTop: '0.5rem' }}>
                  Pembaruan terakhir: {new Date(detail.status_terkini.last_updated).toLocaleString('id-ID')}
                </div>
              )}
            </div>

            {/* Jadwal Mengajar Hari Ini */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurface, margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: theme.colors.primary }}>
                    calendar_today
                  </span>
                  <span>Jadwal Mengajar Hari Ini ({detail.hari})</span>
                </h3>
              </div>

              {detail.jadwal_hari_ini && detail.jadwal_hari_ini.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {detail.jadwal_hari_ini.map((j, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: theme.borderRadius.sm,
                        backgroundColor: theme.colors.surfaceContainerLow,
                        border: `1px solid ${theme.colors.surfaceContainer}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurface }}>
                          {j.mata_kuliah}
                        </div>
                        <div style={{ fontSize: '16px', color: theme.colors.onSurfaceVariant, marginTop: '2px' }}>
                          {j.nama_gedung}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: theme.colors.primary,
                          padding: '0.2rem 0.5rem',
                          backgroundColor: theme.colors.primaryFixed,
                          borderRadius: theme.borderRadius.sm,
                        }}
                      >
                        {j.jam_mulai.slice(0, 5)} - {j.jam_selesai.slice(0, 5)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: theme.borderRadius.sm,
                    backgroundColor: theme.colors.surfaceContainerLow,
                    color: theme.colors.onSurfaceVariant,
                    fontSize: '16px',
                    textAlign: 'center',
                  }}
                >
                  Tidak ada jadwal mengajar dosen pada hari ini.
                </div>
              )}
            </div>

            {/* Jadwal Prediksi Hari Ini (hasil model AI dari habit_summary) */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: theme.colors.primary }}>
                  auto_awesome
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurface, margin: 0 }}>
                  Jadwal Prediksi Hari Ini
                </h3>
              </div>
              {detail.prediksi_hari_ini && detail.prediksi_hari_ini.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {detail.prediksi_hari_ini.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: theme.borderRadius.sm,
                        backgroundColor: '#eef2ff',
                        border: `1px solid ${theme.colors.primaryFixed}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurface }}>
                          {p.nama_gedung}
                        </div>
                        <div style={{ fontSize: '16px', color: theme.colors.onSurfaceVariant, marginTop: '2px' }}>
                          Kebiasaan terprediksi · {Math.round(Number(p.probabilitas))}%
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: theme.colors.primary,
                          padding: '0.2rem 0.5rem',
                          backgroundColor: theme.colors.primaryFixed,
                          borderRadius: theme.borderRadius.sm,
                        }}
                      >
                        {p.jam_mulai.slice(0, 5)} - {p.jam_selesai.slice(0, 5)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: theme.borderRadius.sm,
                    backgroundColor: theme.colors.surfaceContainerLow,
                    color: theme.colors.onSurfaceVariant,
                    fontSize: '16px',
                    textAlign: 'center',
                  }}
                >
                  Prediksi tidak tersedia untuk hari ini.
                </div>
              )}
            </div>

            {/* Tombol Jadwal Minggu Ini */}
            <button
              type="button"
              onClick={() => setShowWeekly((s) => !s)}
              style={{
                width: '100%',
                padding: '0.7rem',
                marginBottom: '1rem',
                borderRadius: theme.borderRadius.full,
                border: `1px solid ${theme.colors.primary}`,
                backgroundColor: showWeekly ? theme.colors.primaryFixed : 'transparent',
                color: theme.colors.primary,
                fontWeight: 700,
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              {showWeekly ? 'Sembunyikan Jadwal Minggu Ini' : 'Lihat Jadwal Minggu Ini'}
            </button>

            {showWeekly && (
              <div style={{ marginBottom: '1.5rem' }}>
                {['senin','selasa','rabu','kamis','jumat','sabtu','minggu'].map((hari) => {
                  const prediksi = (detail.semua_prediksi || []).filter((p) => p.hari === hari);
                  const resmi = (detail.semua_jadwal || []).filter((j) => j.hari === hari);
                  if (prediksi.length === 0 && resmi.length === 0) return null;
                  return (
                    <div key={hari} style={{ marginBottom: '0.9rem' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, textTransform: 'capitalize', color: theme.colors.onSurface, marginBottom: '0.4rem' }}>
                        {hari}
                      </div>
                      {prediksi.map((p, i) => (
                        <div key={`p${i}`} style={{ fontSize: '16px', color: theme.colors.onSurfaceVariant, padding: '0.15rem 0' }}>
                          🔮 {p.jam_mulai.slice(0, 5)}–{p.jam_selesai.slice(0, 5)} · {p.nama_gedung} · {Math.round(Number(p.probabilitas))}%
                        </div>
                      ))}
                      {resmi.map((j, i) => (
                        <div key={`r${i}`} style={{ fontSize: '16px', color: theme.colors.onSurfaceVariant, padding: '0.15rem 0' }}>
                          📚 {j.jam_mulai.slice(0, 5)}–{j.jam_selesai.slice(0, 5)} · {j.mata_kuliah} · {j.nama_gedung}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action Close */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.surfaceContainerHigh,
                color: theme.colors.onSurface,
                border: 'none',
                fontWeight: 700,
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Tutup Detail
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
