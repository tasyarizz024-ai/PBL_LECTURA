import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiJson } from '../lib/api';
import theme from '../styles/theme';
import LecturerCard from '../components/LecturerCard';
import LecturerDetailModal from '../components/LecturerDetailModal';

export default function MahasiswaDashboard() {
  const [lecturers, setLecturers] = useState([]);
  const [prodiList, setProdiList] = useState([]);
  const [error, setError] = useState(null);
  // Kunci filter yang sedang dimuat; null = belum ada respons.
  const [loadedKey, setLoadedKey] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  // Search yang sudah disubmit — input_search sendiri tidak memicu fetch.
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [selectedProdiId, setSelectedProdiId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Selected Lecturer for Detail Modal
  const [selectedLecturerId, setSelectedLecturerId] = useState(null);

  // Fetch list of prodi for filter pills
  useEffect(() => {
    apiJson('/api/dosen/meta/prodi')
      .then((result) => {
        if (result.success) setProdiList(result.data);
      })
      .catch((err) => {
        console.error('Failed to load prodi list:', err);
      });
  }, []);

  // Keyword pencarian disimpan di ref supaya mengetik tidak memicu request:
  // daftar hanya dimuat ulang saat filter berubah atau form disubmit.
  const searchRef = useRef(searchTerm);
  useEffect(() => {
    searchRef.current = searchTerm;
  }, [searchTerm]);

  // Daftar dianggap "memuat" selama kunci ini
  // belum selesai dimuat. Loading di-derive dari sini, bukan di-set di
  // dalam efek.
  const requestKey = `${selectedProdiId}|${selectedStatus}|${submittedSearch}`;
  const loading = loadedKey !== requestKey;

  const fetchLecturers = useCallback(
    ({ term = '' } = {}) => {
      const params = new URLSearchParams();
      const keyword = (term || searchRef.current).trim();
      if (keyword) params.append('search', keyword);
      if (selectedProdiId) params.append('prodi_id', selectedProdiId);
      if (selectedStatus) params.append('status_type', selectedStatus);

      return apiJson(`/api/pencarian-dosen?${params.toString()}`)
        .then((result) => {
          setError(null);
          if (result.success) {
            setLecturers(result.data);
          } else {
            setError(result.message || 'Gagal mengambil data dosen.');
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoadedKey(requestKey));
    },
    [selectedProdiId, selectedStatus, requestKey]
  );

  // Bergantung pada kunci filter saja — mengetik di input search tidak
  // memicu request, hanya saat form disubmit.
  useEffect(() => {
    fetchLecturers({ term: '' });
  }, [fetchLecturers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSubmittedSearch(searchTerm.trim());
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    searchRef.current = '';
    setSubmittedSearch('');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {/* 1. Header & Chip Portal Mahasiswa */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem', position: 'relative' }}>
        {/* Dekorasi ambient blob (glassmorphism) */}
        <div className="animate-float-slow" style={{ position: 'absolute', top: '-3rem', left: '-2rem', width: '180px', height: '180px', borderRadius: '50%', backgroundColor: 'rgba(225, 224, 255, 0.7)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
        <div className="animate-float-reverse" style={{ position: 'absolute', top: '-2rem', right: '-2rem', width: '200px', height: '200px', borderRadius: '50%', backgroundColor: 'rgba(233, 221, 255, 0.6)', filter: 'blur(70px)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.9rem',
            borderRadius: theme.borderRadius.full,
            backgroundColor: theme.colors.surfaceContainerHigh,
            color: theme.colors.primary,
            fontSize: '16px',
            fontWeight: 700,
            marginBottom: '1rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            sensors
          </span>
          <span>PORTAL MAHASISWA • Pencarian Dosen & Presensi Real-Time</span>
        </div>

        <h1
          style={{
            fontSize: '40px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: theme.colors.onSurface,
            margin: '0 0 0.5rem 0',
          }}
        >
          Temukan & Pantau Keberadaan Dosen Kampus
        </h1>
        <p style={{ fontSize: '17px', color: theme.colors.onSurfaceVariant, margin: 0, fontWeight: 500 }}>
          Cari dosen berdasarkan nama, NIP, atau program studi untuk melihat status ketersediaan di ruangan kampus.
        </p>
        </div>
      </div>

      {/* 2. Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          maxWidth: '680px',
          margin: '0 auto 1.5rem',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderRadius: theme.borderRadius.full,
          border: `1px solid ${theme.colors.surfaceContainerHighest}`,
          boxShadow: theme.shadows.cardSm,
          padding: '0.35rem 0.5rem 0.35rem 1.25rem',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ color: theme.colors.onSurfaceVariant, fontSize: '22px', marginRight: '0.65rem' }}
        >
          search
        </span>
        <input
          id="input-search-dosen"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari nama atau NIP dosen..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '16px',
            backgroundColor: 'transparent',
            color: theme.colors.onSurface,
            fontFamily: theme.typography.fontFamily.base,
          }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClearSearch}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: theme.colors.outline,
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              marginRight: '0.5rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              close
            </span>
          </button>
        )}
        <button
          id="btn-cari-dosen"
          type="submit"
          style={{
            background: theme.gradients.primaryCta,
            color: '#ffffff',
            border: 'none',
            borderRadius: theme.borderRadius.full,
            padding: '0.65rem 1.25rem',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: theme.shadows.btnPrimary,
          }}
        >
          <span>Cari Dosen</span>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            arrow_forward
          </span>
        </button>
      </form>

      {/* 3. Filter Pills (Prodi & Status) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', alignItems: 'center', marginBottom: '2rem' }}>
        {/* Prodi Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => setSelectedProdiId('')}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: theme.borderRadius.full,
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              border: selectedProdiId === '' ? 'none' : `1px solid ${theme.colors.outlineVariant}`,
              background: selectedProdiId === '' ? theme.gradients.primaryCta : theme.colors.surfaceContainerLowest,
              color: selectedProdiId === '' ? '#ffffff' : theme.colors.onSurface,
              boxShadow: selectedProdiId === '' ? theme.shadows.btnPrimary : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Semua Prodi
          </button>
          {prodiList.map((p) => {
            const isSelected = String(selectedProdiId) === String(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProdiId(isSelected ? '' : String(p.id))}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: theme.borderRadius.full,
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSelected ? 'none' : `1px solid ${theme.colors.outlineVariant}`,
                  background: isSelected ? theme.gradients.primaryCta : theme.colors.surfaceContainerLowest,
                  color: isSelected ? '#ffffff' : theme.colors.onSurface,
                  boxShadow: isSelected ? theme.shadows.btnPrimary : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {p.nama_prodi}
              </button>
            );
          })}
        </div>

        {/* Status Dropdown Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '16px', color: theme.colors.onSurfaceVariant, fontWeight: 600 }}>
            Filter Status:
          </span>
          <select
            id="select-status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: theme.borderRadius.full,
              border: `1px solid ${theme.colors.surfaceContainerHighest}`,
              backgroundColor: theme.colors.surfaceContainerLowest,
              color: theme.colors.onSurface,
              fontSize: '16px',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Semua Status</option>
            <option value="realtime">Terlacak (Real-time)</option>
            <option value="prediksi">Prediksi Lokasi</option>
            <option value="tidak_diketahui">Tidak Diketahui</option>
          </select>
        </div>
      </div>

      {/* 4. Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: theme.colors.onSurfaceVariant }}>
          Menampilkan <strong style={{ color: theme.colors.primary }}>{lecturers.length}</strong> dosen
        </div>
      </div>

      {/* 5. Lecturer Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: theme.colors.onSurfaceVariant }}>
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '36px', color: theme.colors.primary }}>
            progress_activity
          </span>
          <p style={{ marginTop: '0.75rem', fontSize: '16px' }}>Memuat data ketersediaan dosen...</p>
        </div>
      ) : error ? (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: theme.colors.errorContainer,
            color: theme.colors.onErrorContainer,
            borderRadius: theme.borderRadius.default,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>Terjadi kesalahan: {error}</p>
        </div>
      ) : lecturers.length === 0 ? (
        <div
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            backgroundColor: theme.colors.surfaceContainerLowest,
            borderRadius: theme.borderRadius.default,
            border: `1px solid ${theme.colors.surfaceContainer}`,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '44px', color: theme.colors.outlineVariant }}>
            person_search
          </span>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0.75rem 0 0.25rem 0' }}>
            Tidak ada dosen yang cocok
          </h3>
          <p style={{ fontSize: '16px', color: theme.colors.onSurfaceVariant, margin: 0 }}>
            Coba ubah kata kunci pencarian atau reset filter program studi.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {lecturers.map((lec) => (
            <LecturerCard
              key={lec.dosen_id}
              lecturer={lec}
              onSelect={(dosen) => setSelectedLecturerId(dosen.dosen_id)}
            />
          ))}
        </div>
      )}

      {/* 6. Lecturer Detail Modal */}
      {selectedLecturerId && (
        <LecturerDetailModal
          lecturerId={selectedLecturerId}
          onClose={() => setSelectedLecturerId(null)}
        />
      )}
    </div>
  );
}
