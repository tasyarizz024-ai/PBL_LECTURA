import React, { useState, useEffect } from 'react';
import { apiJson } from '../lib/api';
import theme from '../styles/theme';

function StatCard({ icon, label, value, gradient, loading }) {
  return (
    <div
      style={{
        backgroundColor: theme.colors.surfaceContainerLowest,
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.colors.surfaceContainer}`,
        padding: '1.5rem',
        boxShadow: theme.shadows.cardSm,
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        transition: 'box-shadow 0.2s',
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: theme.borderRadius.default,
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          flexShrink: 0,
          boxShadow: theme.shadows.btnPrimary,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
          {label}
        </div>
        {loading ? (
          <div style={{ height: '28px', width: '60px', backgroundColor: theme.colors.surfaceContainer, borderRadius: theme.borderRadius.sm }} />
        ) : (
          <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', color: theme.colors.onSurface }}>
            {value ?? '—'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Dosen & gedung paralel; pencarian menyusul karena butuh hitung status.
        const [dosenData, gedungData] = await Promise.all([
          apiJson('/api/dosen?limit=1000'),
          apiJson('/api/gedung'),
        ]);

        const totalDosen = dosenData.pagination?.total || dosenData.data?.length || 0;
        const totalGedung = gedungData.data?.length || 0;

        // Active GPS: hitung dari pencarian dosen (status realtime)
        const pencarianData = await apiJson('/api/pencarian-dosen?status_type=realtime');
        const activeGps = pencarianData.data?.length || 0;

        setStats({ totalDosen, totalGedung, activeGps });
      } catch {
        setStats({ totalDosen: 0, totalGedung: 0, activeGps: 0 });
      } finally {
        setLoading(false);
      }
    };

    const fetchRecentLogs = async () => {
      try {
        const data = await apiJson('/api/log-aktivitas?limit=8');
        if (data.success) setRecentLogs(data.data || []);
      } catch {
        // ignore
      } finally {
        setLogsLoading(false);
      }
    };

    fetchStats();
    fetchRecentLogs();
  }, []);

  const statusColors = {
    realtime: { color: theme.colors.status.realtime.text, bg: theme.colors.status.realtime.bg, label: 'Terlacak' },
    prediksi: { color: theme.colors.status.prediksi.text, bg: theme.colors.status.prediksi.bg, label: 'Prediksi' },
    tidak_diketahui: { color: theme.colors.status.tidak_diketahui.text, bg: theme.colors.status.tidak_diketahui.bg, label: 'Tidak diketahui' },
  };

  return (
    <div>
      {/* Welcome Banner */}
      <div
        style={{
          borderRadius: theme.borderRadius.lg,
          background: theme.gradients.primaryCta,
          color: '#fff',
          padding: '1.75rem 2rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: theme.shadows.btnPrimary,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.8, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            LECTURA Admin Panel
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            Selamat datang, Administrator 👋
          </h1>
          <p style={{ margin: 0, opacity: 0.85, fontSize: '13px' }}>
            Pantau dan kelola data dosen, gedung, serta aktivitas presensi dari sini.
          </p>
        </div>
        <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '140px', height: '140px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div style={{ position: 'absolute', right: '60px', bottom: '-30px', width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.07)' }} />
        <span className="material-symbols-outlined" style={{ fontSize: '72px', opacity: 0.15, position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)' }}>
          analytics
        </span>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <StatCard
          icon="sensors"
          label="Dosen Aktif GPS"
          value={stats?.activeGps}
          gradient="linear-gradient(135deg, #10b981, #059669)"
          loading={loading}
        />
        <StatCard
          icon="people"
          label="Total Dosen"
          value={stats?.totalDosen}
          gradient={theme.gradients.primaryCta}
          loading={loading}
        />
        <StatCard
          icon="location_city"
          label="Total Gedung"
          value={stats?.totalGedung}
          gradient="linear-gradient(135deg, #6b38d4, #8455ef)"
          loading={loading}
        />
      </div>

      {/* Recent Activity */}
      <div
        style={{
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.surfaceContainer}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: theme.colors.primary }}>history</span>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: theme.colors.onSurface, margin: 0 }}>
            Aktivitas Lokasi Terbaru
          </h2>
        </div>

        {logsLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
            <span className="material-symbols-outlined animate-spin" style={{ fontSize: '28px', color: theme.colors.primary }}>progress_activity</span>
          </div>
        ) : recentLogs.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: theme.colors.onSurfaceVariant, fontSize: '13px' }}>
            Belum ada log aktivitas tersedia.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: theme.colors.surfaceContainerLow }}>
                  {['Dosen', 'Gedung', 'Status', 'Waktu'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.75rem 1.25rem',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: theme.colors.onSurfaceVariant,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log, idx) => {
                  const st = statusColors[log.status_type] || statusColors.tidak_diketahui;
                  return (
                    <tr
                      key={log.log_id || idx}
                      style={{
                        borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '13px', fontWeight: 600, color: theme.colors.onSurface }}>
                        {log.nama_dosen || '—'}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '13px', color: theme.colors.onSurfaceVariant }}>
                        {log.nama_gedung || '—'}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: theme.borderRadius.full,
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: st.bg,
                            color: st.color,
                          }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '12px', color: theme.colors.outline, whiteSpace: 'nowrap' }}>
                        {log.waktu_log
                          ? new Date(log.waktu_log).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
