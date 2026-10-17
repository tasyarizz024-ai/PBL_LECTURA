import React, { useState, useEffect, useCallback } from 'react';
import { apiJson } from '../lib/api';
import theme from '../styles/theme';

const STATUS_COLORS = {
  realtime: { label: 'Terlacak', bg: '#ecfdf5', color: '#047857' },
  prediksi: { label: 'Prediksi', bg: '#e0f2fe', color: '#0369a1' },
  tidak_diketahui: { label: 'Tidak diketahui', bg: '#f3f4f6', color: '#4b5563' },
};

const ITEMS_PER_PAGE = 20;

export default function LogAktivitas() {
  const [logs, setLogs] = useState([]);
  const [dosenList, setDosenList] = useState([]);

  // Filters
  const [selectedDosenId, setSelectedDosenId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  // Kunci permintaan yang sudah selesai dimuat (lihat fetchLogs).
  const [loadedKey, setLoadedKey] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch dosen list for filter dropdown
  useEffect(() => {
    apiJson('/api/dosen?limit=500')
      .then((data) => {
        if (data.success) setDosenList(data.data || []);
      })
      .catch(() => { /* ignore */ });
  }, []);

  const fetchLogs = useCallback(
    (currentPage = 1) => {
      const params = new URLSearchParams();
      if (selectedDosenId) params.append('dosen_id', selectedDosenId);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('page', currentPage);
      params.append('limit', ITEMS_PER_PAGE);

      return apiJson(`/api/log-aktivitas?${params}`)
        .then((data) => {
          if (data.success) {
            setLogs(data.data || []);
            const total = data.pagination?.total || data.data?.length || 0;
            setTotalItems(total);
            setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));
          }
        })
        .catch(() => { /* ignore */ })
        .finally(() => setLoadedKey(`${selectedDosenId}|${dateFrom}|${dateTo}|${currentPage}`));
    },
    [selectedDosenId, dateFrom, dateTo]
  );

  // Loading diturunkan dari kunci yang sudah selesai dimuat, sehingga tidak
  // perlu setLoading() sinkron di dalam efek.
  const requestKey = `${selectedDosenId}|${dateFrom}|${dateTo}|${page}`;
  const loading = loadedKey !== requestKey;

  // Muat ulang saat filter atau halaman berubah. Reset ke halaman 1 dilakukan
  // di handler filter (bukan di efek), jadi efek ini murni sinkronisasi data.
  useEffect(() => {
    fetchLogs(page);
  }, [fetchLogs, page]);

  // Setiap perubahan filter mengulang dari halaman 1.
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const handlePageChange = (newPage) => setPage(newPage);

  const handleReset = () => {
    setSelectedDosenId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const inputStyle = {
    padding: '0.6rem 1rem',
    borderRadius: theme.borderRadius.full,
    border: `1px solid ${theme.colors.surfaceContainerHighest}`,
    backgroundColor: theme.colors.surfaceContainerLow,
    color: theme.colors.onSurface,
    fontSize: '16px',
    fontFamily: theme.typography.fontFamily.base,
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: theme.colors.onSurface, margin: '0 0 0.25rem 0' }}>
          Log Aktivitas Lokasi
        </h1>
        <p style={{ margin: 0, fontSize: '16px', color: theme.colors.onSurfaceVariant }}>
          Riwayat lengkap aktivitas check-in lokasi dosen di setiap gedung kampus.
        </p>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.surfaceContainer}`,
          padding: '1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '200px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: theme.colors.outline }}>person</span>
          <select
            value={selectedDosenId}
            onChange={handleFilterChange(setSelectedDosenId)}
            style={{ ...inputStyle, flex: 1 }}
          >
            <option value="">Semua Dosen</option>
            {dosenList.map((d) => (
              <option key={d.dosen_id} value={d.dosen_id}>{d.nama}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: theme.colors.outline }}>calendar_today</span>
          <input
            type="date"
            value={dateFrom}
            onChange={handleFilterChange(setDateFrom)}
            style={inputStyle}
            title="Dari tanggal"
          />
          <span style={{ fontSize: '16px', color: theme.colors.onSurfaceVariant }}>s/d</span>
          <input
            type="date"
            value={dateTo}
            onChange={handleFilterChange(setDateTo)}
            style={inputStyle}
            title="Sampai tanggal"
          />
        </div>

        {(selectedDosenId || dateFrom || dateTo) && (
          <button
            type="button"
            onClick={handleReset}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.6rem 1rem',
              borderRadius: theme.borderRadius.full,
              border: `1px solid ${theme.colors.outlineVariant}`,
              backgroundColor: 'transparent',
              color: theme.colors.onSurfaceVariant,
              cursor: 'pointer',
              fontSize: '16px', fontWeight: 600,
              fontFamily: theme.typography.fontFamily.base,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>filter_list_off</span>
            Reset Filter
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '16px', color: theme.colors.onSurfaceVariant, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {totalItems} entri ditemukan
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.surfaceContainer}`,
          overflow: 'hidden',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: theme.colors.surfaceContainerLow }}>
                {['#', 'Dosen', 'Gedung', 'Status', 'Probabilitas', 'Waktu Log'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '0.85rem 1.25rem',
                      textAlign: h === '#' ? 'center' : 'left',
                      fontSize: '16px', fontWeight: 700,
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
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '28px', color: theme.colors.primary }}>progress_activity</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '44px', color: theme.colors.outlineVariant, display: 'block', marginBottom: '0.75rem' }}>history_toggle_off</span>
                    <p style={{ margin: 0, fontSize: '16px', color: theme.colors.onSurfaceVariant }}>
                      Tidak ada log aktivitas yang sesuai dengan filter.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => {
                  const st = STATUS_COLORS[log.status_type] || STATUS_COLORS.tidak_diketahui;
                  const rowNum = (page - 1) * ITEMS_PER_PAGE + idx + 1;
                  return (
                    <tr
                      key={log.log_id || idx}
                      style={{
                        borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
                      }}
                    >
                      <td style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '16px', color: theme.colors.outline, fontWeight: 600 }}>
                        {rowNum}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurface }}>
                          {log.nama_dosen || '—'}
                        </div>
                        {log.nip && (
                          <div style={{ fontSize: '16px', color: theme.colors.outline, fontFamily: 'monospace' }}>
                            NIP: {log.nip}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '16px', color: theme.colors.onSurfaceVariant }}>
                        {log.nama_gedung || '—'}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: theme.borderRadius.full,
                            fontSize: '16px', fontWeight: 700,
                            backgroundColor: st.bg,
                            color: st.color,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '16px', color: theme.colors.onSurfaceVariant }}>
                        {log.probabilitas != null
                          ? (
                            <span style={{ fontWeight: 700, color: theme.colors.primary }}>
                              {Math.round(log.probabilitas * 100)}%
                            </span>
                          )
                          : '—'}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '16px', color: theme.colors.outline, whiteSpace: 'nowrap' }}>
                        {log.waktu_log
                          ? new Date(log.waktu_log).toLocaleString('id-ID', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: theme.borderRadius.full,
              border: `1px solid ${theme.colors.surfaceContainerHighest}`,
              backgroundColor: page <= 1 ? theme.colors.surfaceContainerLow : theme.colors.surfaceContainerLowest,
              color: page <= 1 ? theme.colors.outline : theme.colors.onSurface,
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '16px', fontWeight: 600,
              fontFamily: theme.typography.fontFamily.base,
              display: 'flex', alignItems: 'center', gap: '0.25rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
            Prev
          </button>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            const isActive = pageNum === page;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => handlePageChange(pageNum)}
                style={{
                  width: '36px', height: '36px',
                  borderRadius: theme.borderRadius.full,
                  border: 'none',
                  backgroundColor: isActive ? theme.colors.primary : 'transparent',
                  color: isActive ? '#fff' : theme.colors.onSurfaceVariant,
                  cursor: 'pointer',
                  fontSize: '16px', fontWeight: isActive ? 700 : 500,
                  fontFamily: theme.typography.fontFamily.base,
                  boxShadow: isActive ? theme.shadows.btnPrimary : 'none',
                }}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: theme.borderRadius.full,
              border: `1px solid ${theme.colors.surfaceContainerHighest}`,
              backgroundColor: page >= totalPages ? theme.colors.surfaceContainerLow : theme.colors.surfaceContainerLowest,
              color: page >= totalPages ? theme.colors.outline : theme.colors.onSurface,
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              fontSize: '16px', fontWeight: 600,
              fontFamily: theme.typography.fontFamily.base,
              display: 'flex', alignItems: 'center', gap: '0.25rem',
            }}
          >
            Next
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
