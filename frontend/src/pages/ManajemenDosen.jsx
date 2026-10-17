import React, { useState, useEffect, useCallback } from 'react';
import { useRef } from 'react';
import { apiJson } from '../lib/api';
import theme from '../styles/theme';

const EMPTY_FORM = {
  nama: '',
  nip: '',
  jabatan: '',
  foto: '',
  prodi_id: '',
  email: '',
};

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        backgroundColor: 'rgba(17, 28, 45, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderRadius: theme.borderRadius.lg,
          padding: '2rem',
          maxWidth: '380px',
          width: '90%',
          boxShadow: theme.shadows.card,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '28px', color: theme.colors.error }}>delete_forever</span>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurface, margin: 0 }}>Konfirmasi Hapus</h3>
        </div>
        <p style={{ fontSize: '16px', color: theme.colors.onSurfaceVariant, marginBottom: '1.5rem', lineHeight: 1.6 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: theme.borderRadius.full,
              border: `1px solid ${theme.colors.outlineVariant}`,
              backgroundColor: 'transparent', cursor: 'pointer',
              fontSize: '16px', fontWeight: 600,
              color: theme.colors.onSurfaceVariant,
              fontFamily: theme.typography.fontFamily.base,
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: theme.borderRadius.full,
              border: 'none', backgroundColor: theme.colors.error, color: '#fff',
              cursor: 'pointer', fontSize: '16px', fontWeight: 700,
              fontFamily: theme.typography.fontFamily.base,
              boxShadow: '0 4px 12px rgba(186,26,26,0.3)',
            }}
          >
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

function DosenFormModal({ isOpen, dosenData, prodiList, onClose, onSaved }) {
  // Form diinisialisasi langsung dari props; parent me-remount lewat `key`
  // setiap kali modal dibuka, jadi tidak perlu efek untuk menyalin props.
  const [form, setForm] = useState(() =>
    dosenData
      ? {
          nama: dosenData.nama || '',
          nip: dosenData.nip || '',
          jabatan: dosenData.jabatan || '',
          foto: dosenData.foto || '',
          prodi_id: dosenData.prodi_id ? String(dosenData.prodi_id) : '',
          email: dosenData.email || '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama.trim()) { setError('Nama dosen wajib diisi.'); return; }
    if (!form.nip.trim()) { setError('NIP wajib diisi.'); return; }
    if (!form.email.trim()) { setError('Email wajib diisi.'); return; }
    if (!form.prodi_id) { setError('Program Studi wajib dipilih.'); return; }
    setSaving(true);
    setError('');
    try {
      const body = { ...form, prodi_id: form.prodi_id || null };
      // Backend mengembalikan primary key sebagai `id`.
      const url = dosenData ? `/api/dosen/${dosenData.id ?? dosenData.dosen_id}` : '/api/dosen';
      const method = dosenData ? 'PUT' : 'POST';
      await apiJson(url, { method, body: JSON.stringify(body) });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const fieldStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: theme.borderRadius.default,
    border: `1.5px solid ${theme.colors.surfaceContainerHighest}`,
    backgroundColor: theme.colors.surfaceContainerLowest,
    fontSize: '16px',
    color: theme.colors.onSurface,
    fontFamily: theme.typography.fontFamily.base,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(17, 28, 45, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderRadius: theme.borderRadius.xl,
          padding: '2rem',
          maxWidth: '500px',
          width: '92%',
          boxShadow: theme.shadows.card,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: theme.colors.onSurface, margin: 0 }}>
            {dosenData ? 'Edit Data Dosen' : 'Tambah Dosen Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: theme.colors.outline, display: 'flex' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurfaceVariant, display: 'block', marginBottom: '0.4rem' }}>
              Nama Lengkap *
            </label>
            <input value={form.nama} onChange={handleChange('nama')} placeholder="Dr. Nama Dosen, M.Kom." style={fieldStyle} />
          </div>
          <div>
            <label style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurfaceVariant, display: 'block', marginBottom: '0.4rem' }}>
              NIP *
            </label>
            <input value={form.nip} onChange={handleChange('nip')} placeholder="198001012010011001" style={fieldStyle} />
          </div>
          <div>
            <label style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurfaceVariant, display: 'block', marginBottom: '0.4rem' }}>
              Email Kampus *
            </label>
            <input type="email" value={form.email} onChange={handleChange('email')} placeholder="nama.dosen@polinela.ac.id" style={fieldStyle} />
          </div>
          <div>
            <label style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurfaceVariant, display: 'block', marginBottom: '0.4rem' }}>
              Jabatan
            </label>
            <input value={form.jabatan} onChange={handleChange('jabatan')} placeholder="Lektor Kepala" style={fieldStyle} />
          </div>
          <div>
            <label style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurfaceVariant, display: 'block', marginBottom: '0.4rem' }}>
              Program Studi
            </label>
            <select value={form.prodi_id} onChange={handleChange('prodi_id')} style={fieldStyle}>
              <option value="">— Pilih Prodi —</option>
              {prodiList.map((p) => (
                <option key={p.id} value={p.id}>{p.nama_prodi}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurfaceVariant, display: 'block', marginBottom: '0.4rem' }}>
              URL Foto (opsional)
            </label>
            <input value={form.foto} onChange={handleChange('foto')} placeholder="https://..." style={fieldStyle} />
          </div>

          {error && (
            <div
              style={{
                backgroundColor: theme.colors.errorContainer,
                color: theme.colors.onErrorContainer,
                borderRadius: theme.borderRadius.default,
                padding: '0.75rem 1rem',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.7rem 1.5rem', borderRadius: theme.borderRadius.full,
                border: `1px solid ${theme.colors.outlineVariant}`,
                backgroundColor: 'transparent', cursor: 'pointer',
                fontSize: '16px', fontWeight: 600,
                color: theme.colors.onSurfaceVariant,
                fontFamily: theme.typography.fontFamily.base,
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.7rem 1.5rem', borderRadius: theme.borderRadius.full,
                border: 'none',
                background: saving ? theme.colors.surfaceContainerHigh : theme.gradients.primaryCta,
                color: saving ? theme.colors.onSurfaceVariant : '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '16px', fontWeight: 700,
                fontFamily: theme.typography.fontFamily.base,
                boxShadow: saving ? 'none' : theme.shadows.btnPrimary,
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              {saving && <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>progress_activity</span>}
              {saving ? 'Menyimpan...' : dosenData ? 'Simpan Perubahan' : 'Tambah Dosen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManajemenDosen() {
  const [dosenList, setDosenList] = useState([]);
  const [prodiList, setProdiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProdi, setSelectedProdi] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editDosen, setEditDosen] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProdi = useCallback(async () => {
    try {
      const data = await apiJson('/api/dosen/meta/prodi');
      if (data.success) setProdiList(data.data || []);
    } catch { /* ignore */ }
  }, []);

  // searchTerm disimpan di ref supaya penulisan di input tidak memicu
  // request: reload hanya terjadi saat filter prodi berubah atau saat
  // form search disubmit.
  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  // Hanya bergantung pada selectedProdi — bukan pada nilai search.
  const fetchDosen = useCallback(async ({ term = '' } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const keyword = (term || searchRef.current).trim();
      if (keyword) params.append('search', keyword);
      if (selectedProdi) params.append('prodi_id', selectedProdi);
      const data = await apiJson(`/api/dosen?${params}`);
      if (data.success) setDosenList(data.data || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [selectedProdi]);

  // Mount-time fetch; lint dimatikan karena memang sinkronisasi dengan server.
  /* eslint-disable react/set-state-in-effect */
  useEffect(() => { fetchProdi(); }, [fetchProdi]);
  useEffect(() => { fetchDosen(); }, [fetchDosen]);
  /* eslint-enable react/set-state-in-effect */

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDosen();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiJson(`/api/dosen/${deleteTarget.id ?? deleteTarget.dosen_id}`, {
        method: 'DELETE',
      });
      showToast(`Dosen "${deleteTarget.nama}" berhasil dihapus.`);
      fetchDosen();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 300,
            padding: '0.85rem 1.25rem',
            borderRadius: theme.borderRadius.default,
            backgroundColor: toast.type === 'error' ? theme.colors.errorContainer : '#ecfdf5',
            color: toast.type === 'error' ? theme.colors.onErrorContainer : '#047857',
            boxShadow: theme.shadows.card,
            fontSize: '16px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            animation: 'slideUp 0.3s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: theme.colors.onSurface, margin: '0 0 0.25rem 0' }}>Manajemen Dosen</h1>
          <p style={{ margin: 0, fontSize: '16px', color: theme.colors.onSurfaceVariant }}>
            Kelola data dosen: tambah, edit, dan hapus.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditDosen(null); setModalOpen(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.7rem 1.4rem',
            borderRadius: theme.borderRadius.full,
            border: 'none',
            background: theme.gradients.primaryCta,
            color: '#fff', cursor: 'pointer',
            fontSize: '16px', fontWeight: 700,
            fontFamily: theme.typography.fontFamily.base,
            boxShadow: theme.shadows.btnPrimary,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
          Tambah Dosen
        </button>
      </div>

      {/* Filters */}
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
        <form onSubmit={handleSearch} style={{ display: 'flex', flex: 1, minWidth: '220px', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              flex: 1, display: 'flex', alignItems: 'center',
              backgroundColor: theme.colors.surfaceContainerLow,
              border: `1px solid ${theme.colors.surfaceContainerHighest}`,
              borderRadius: theme.borderRadius.full,
              padding: '0 1rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: theme.colors.outline, marginRight: '0.5rem' }}>search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau NIP..."
              style={{
                flex: 1, border: 'none', outline: 'none',
                backgroundColor: 'transparent',
                fontSize: '16px', color: theme.colors.onSurface,
                fontFamily: theme.typography.fontFamily.base,
                padding: '0.65rem 0',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.6rem 1.1rem', borderRadius: theme.borderRadius.full,
              border: 'none', background: theme.gradients.primaryCta,
              color: '#fff', cursor: 'pointer', fontSize: '16px', fontWeight: 700,
              fontFamily: theme.typography.fontFamily.base,
            }}
          >
            Cari
          </button>
        </form>

        <select
          value={selectedProdi}
          onChange={(e) => setSelectedProdi(e.target.value)}
          style={{
            padding: '0.65rem 1rem',
            borderRadius: theme.borderRadius.full,
            border: `1px solid ${theme.colors.surfaceContainerHighest}`,
            backgroundColor: theme.colors.surfaceContainerLow,
            color: theme.colors.onSurface,
            fontSize: '16px', fontWeight: 600,
            fontFamily: theme.typography.fontFamily.base,
            outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">Semua Prodi</option>
          {prodiList.map((p) => (
            <option key={p.id} value={p.id}>{p.nama_prodi}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.surfaceContainer}`,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: theme.colors.surfaceContainerLow }}>
                {['Dosen', 'NIP', 'Jabatan', 'Program Studi', 'Aksi'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '0.85rem 1.25rem',
                      textAlign: h === 'Aksi' ? 'center' : 'left',
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
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '28px', color: theme.colors.primary }}>progress_activity</span>
                  </td>
                </tr>
              ) : dosenList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: theme.colors.onSurfaceVariant, fontSize: '16px' }}>
                    Tidak ada dosen yang ditemukan.
                  </td>
                </tr>
              ) : (
                dosenList.map((d) => (
                  <tr
                    key={d.id}
                    style={{ borderBottom: `1px solid ${theme.colors.surfaceContainer}` }}
                  >
                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            overflow: 'hidden', flexShrink: 0,
                            backgroundColor: theme.colors.surfaceContainerHigh,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {d.foto ? (
                            <img src={d.foto} alt={d.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: theme.colors.outline }}>person</span>
                          )}
                        </div>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurface }}>{d.nama}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem', fontSize: '16px', color: theme.colors.onSurfaceVariant, fontFamily: 'monospace' }}>
                      {d.nip || '—'}
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem', fontSize: '16px', color: theme.colors.onSurfaceVariant }}>
                      {d.jabatan || '—'}
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      {d.nama_prodi ? (
                        <span
                          style={{
                            padding: '0.2rem 0.75rem',
                            borderRadius: theme.borderRadius.full,
                            fontSize: '16px', fontWeight: 700,
                            backgroundColor: theme.colors.primaryFixed,
                            color: theme.colors.primary,
                          }}
                        >
                          {d.nama_prodi}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => { setEditDosen(d); setModalOpen(true); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.4rem 0.85rem',
                            borderRadius: theme.borderRadius.full,
                            border: `1px solid ${theme.colors.primary}`,
                            backgroundColor: theme.colors.primaryFixed,
                            color: theme.colors.primary,
                            cursor: 'pointer', fontSize: '16px', fontWeight: 700,
                            fontFamily: theme.typography.fontFamily.base,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(d)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.4rem 0.85rem',
                            borderRadius: theme.borderRadius.full,
                            border: `1px solid ${theme.colors.error}`,
                            backgroundColor: theme.colors.errorContainer,
                            color: theme.colors.error,
                            cursor: 'pointer', fontSize: '16px', fontWeight: 700,
                            fontFamily: theme.typography.fontFamily.base,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {modalOpen && (
      <DosenFormModal
        key={editDosen ? `edit-${editDosen.id}` : 'create'}
        isOpen={modalOpen}
        dosenData={editDosen}
        prodiList={prodiList}
        onClose={() => { setModalOpen(false); setEditDosen(null); }}
        onSaved={() => {
          fetchDosen();
          showToast(editDosen ? 'Data dosen berhasil diperbarui.' : 'Dosen baru berhasil ditambahkan.');
        }}
      />
      )}

      {/* Confirm Delete Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Yakin ingin menghapus dosen "${deleteTarget.nama}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
