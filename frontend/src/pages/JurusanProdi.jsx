import React, { useState, useCallback, useEffect } from 'react';
import theme from '../styles/theme';
import { apiJson } from '../lib/api';

const EMPTY_FORM = { nama_jurusan: '', nama_prodi: '', jurusan_id: '' };

const fieldStyle = {
  width: '100%',
  padding: '0.6rem 0.85rem',
  borderRadius: theme.borderRadius.default,
  border: `1px solid ${theme.colors.outlineVariant}`,
  backgroundColor: theme.colors.surfaceContainerLowest,
  fontSize: '16px',
  color: theme.colors.onSurface,
  fontFamily: theme.typography.fontFamily.base,
  outline: 'none',
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
          padding: '2rem', maxWidth: '380px', width: '90%',
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
            type="button" onClick={onCancel}
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
            type="button" onClick={onConfirm}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: theme.borderRadius.full,
              border: 'none', backgroundColor: theme.colors.error, color: '#fff',
              cursor: 'pointer', fontSize: '16px', fontWeight: 700,
              fontFamily: theme.typography.fontFamily.base,
            }}
          >
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Form modal generik untuk Jurusan & Prodi.
 * type 'prodi' menampilkan dropdown jurusan (wajib ada hubungannya).
 */
function EntityFormModal({ type, initialData, jurusanList, onClose, onSubmit }) {
  // Parent me-remount lewat `key`, jadi form cukup diinisialisasi sekali
  // dari props — tanpa efek yang menyalin props ke state.
  const [form, setForm] = useState(initialData || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isProdi = type === 'prodi';
  const namaField = isProdi ? 'nama_prodi' : 'nama_jurusan';

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!String(form[namaField] || '').trim()) {
      setError(isProdi ? 'Nama prodi wajib diisi.' : 'Nama jurusan wajib diisi.');
      return;
    }
    if (isProdi && !form.jurusan_id) {
      setError('Jurusan induk wajib dipilih.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        entityName: form[namaField].trim(),
        jurusan_id: isProdi ? Number(form.jurusan_id) : undefined,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        backgroundColor: 'rgba(17, 28, 45, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderRadius: theme.borderRadius.lg,
          padding: '1.75rem',
          maxWidth: '440px', width: '92%',
          boxShadow: theme.shadows.card,
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '22px', color: theme.colors.primary }}>
            {isProdi ? 'school' : 'account_tree'}
          </span>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurface, margin: 0 }}>
            {initialData ? 'Edit' : 'Tambah'} {isProdi ? 'Prodi' : 'Jurusan'}
          </h3>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '16px', fontWeight: 600, color: theme.colors.onSurfaceVariant, display: 'block', marginBottom: '0.3rem' }}>
            {isProdi ? 'Nama Prodi *' : 'Nama Jurusan *'}
          </label>
          <input
            autoFocus
            value={form[namaField]}
            onChange={handleChange(namaField)}
            placeholder={isProdi ? 'Sistem Informasi' : 'Teknik Informatika'}
            style={fieldStyle}
          />
        </div>

        {isProdi && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '16px', fontWeight: 600, color: theme.colors.onSurfaceVariant, display: 'block', marginBottom: '0.3rem' }}>
              Jurusan Induk *
            </label>
            <select
              value={form.jurusan_id}
              onChange={handleChange('jurusan_id')}
              style={{ ...fieldStyle, cursor: 'pointer' }}
            >
              <option value="">-- Pilih Jurusan --</option>
              {jurusanList.map((j) => (
                <option key={j.id} value={j.id}>{j.nama_jurusan}</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: theme.colors.errorContainer,
            color: theme.colors.onErrorContainer,
            borderRadius: theme.borderRadius.default,
            padding: '0.75rem 1rem', fontSize: '16px',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button
            type="button" onClick={onClose}
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
            type="submit" disabled={saving}
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
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}

const thStyle = {
  padding: '0.85rem 1.25rem', textAlign: 'left', fontSize: '16px',
  fontWeight: 700, color: theme.colors.onSurfaceVariant,
  textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
};

function JurusanProdi() {
  const [jurusanList, setJurusanList] = useState([]);
  const [prodiList, setProdiList] = useState([]);
  // null = belum ada respons; setelah itu semua data dianggap ter-cache.
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // { type, data }
  const [deleteTarget, setDeleteTarget] = useState(null);

  const flash = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchAll = useCallback(
    () =>
      Promise.all([
        apiJson('/api/jurusan-prodi/jurusan'),
        apiJson('/api/jurusan-prodi/prodi'),
      ])
        .then(([j, p]) => {
          setJurusanList(j.data || []);
          setProdiList(p.data || []);
        })
        .catch((err) => flash(err.message, 'error'))
        .finally(() => setLoadedOnce(true)),
    [flash]
  );

  const loading = !loadedOnce;

  // Mount-time fetch — sinkronisasi dengan server.
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSubmit = async ({ type, data, entityName, jurusan_id: parentJurusanId }) => {
    const base = `/api/jurusan-prodi/${type}`;
    const editing = Boolean(data?.id);
    const body = type === 'prodi'
      ? { nama_prodi: entityName, jurusan_id: parentJurusanId }
      : { nama_jurusan: entityName };

    const result = await apiJson(editing ? `${base}/${data.id}` : base, {
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify(body),
    });

    setModal(null);
    flash(result.message);
    // Jurusan baru/berubah bisa memengaruhi kolom prodi & dropdown mahasiswa.
    await fetchAll();
    return result;
  };

  const handleDelete = async () => {
    const { type, id } = deleteTarget;
    try {
      const result = await apiJson(`/api/jurusan-prodi/${type}/${id}`, { method: 'DELETE' });
      flash(result.message);
      await fetchAll();
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const filterText = search.trim().toLowerCase();
  const filteredJurusan = filterText
    ? jurusanList.filter((j) => j.nama_jurusan.toLowerCase().includes(filterText))
    : jurusanList;
  const filteredProdi = filterText
    ? prodiList.filter(
        (p) =>
          p.nama_prodi.toLowerCase().includes(filterText) ||
          p.nama_jurusan.toLowerCase().includes(filterText)
      )
    : prodiList;

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 300,
          padding: '0.85rem 1.25rem', borderRadius: theme.borderRadius.default,
          backgroundColor: toast.type === 'error' ? theme.colors.errorContainer : '#ecfdf5',
          color: toast.type === 'error' ? theme.colors.onErrorContainer : '#047857',
          boxShadow: theme.shadows.card, fontSize: '16px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: theme.colors.onSurface, margin: '0 0 0.25rem 0' }}>
            Manajemen Jurusan &amp; Prodi
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: theme.colors.onSurfaceVariant }}>
            Data master pendukung filter pada Dashboard Cari Dosen.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setModal({ type: 'prodi', data: null })}
            disabled={jurusanList.length === 0}
            title={jurusanList.length === 0 ? 'Tambahkan jurusan terlebih dahulu' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.7rem 1.4rem', borderRadius: theme.borderRadius.full,
              border: `1px solid ${theme.colors.primary}`,
              backgroundColor: theme.colors.primaryFixed, color: theme.colors.primary,
              cursor: jurusanList.length === 0 ? 'not-allowed' : 'pointer',
              opacity: jurusanList.length === 0 ? 0.6 : 1,
              fontSize: '16px', fontWeight: 700,
              fontFamily: theme.typography.fontFamily.base,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            Tambah Prodi
          </button>
          <button
            type="button"
            onClick={() => setModal({ type: 'jurusan', data: null })}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.7rem 1.4rem', borderRadius: theme.borderRadius.full,
              border: 'none', background: theme.gradients.primaryCta, color: '#fff',
              cursor: 'pointer', fontSize: '16px', fontWeight: 700,
              fontFamily: theme.typography.fontFamily.base,
              boxShadow: theme.shadows.btnPrimary,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>account_tree</span>
            Tambah Jurusan
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{
        backgroundColor: theme.colors.surfaceContainerLowest,
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.colors.surfaceContainer}`,
        padding: '0.85rem 1.25rem', marginBottom: '1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.6rem',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: theme.colors.outline }}>search</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari jurusan atau prodi..."
          style={{ ...fieldStyle, border: 'none', padding: '0.25rem 0', backgroundColor: 'transparent' }}
        />
        {search && (
          <button
            type="button" onClick={() => setSearch('')}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: theme.colors.outline }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '16px', color: theme.colors.onSurfaceVariant, fontWeight: 600 }}>
          {jurusanList.length} jurusan · {prodiList.length} prodi
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: theme.colors.onSurfaceVariant }}>
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '36px', color: theme.colors.primary }}>progress_activity</span>
        </div>
      ) : (
        <>
          {/* JURUSAN */}
          <h2 style={{
            fontSize: '15px', fontWeight: 700, color: theme.colors.onSurface,
            margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: theme.colors.primary }}>account_tree</span>
            Jurusan
          </h2>
          <div style={{
            backgroundColor: theme.colors.surfaceContainerLowest,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.surfaceContainer}`,
            overflow: 'hidden', marginBottom: '1.75rem',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: theme.colors.surfaceContainerLow }}>
                    <th style={{ ...thStyle, textAlign: 'center', width: '60px' }}>#</th>
                    <th style={thStyle}>Nama Jurusan</th>
                    <th style={thStyle}>Jumlah Prodi</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJurusan.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '2.5rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '36px', color: theme.colors.outlineVariant, display: 'block', marginBottom: '0.5rem' }}>account_tree</span>
                        Belum ada jurusan yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredJurusan.map((j, idx) => (
                      <tr key={j.id} style={{ borderTop: `1px solid ${theme.colors.surfaceContainer}` }}>
                        <td style={{ ...thStyle, textTransform: 'none', color: theme.colors.outline }}>{idx + 1}</td>
                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '16px', fontWeight: 600, color: theme.colors.onSurface }}>
                          {j.nama_jurusan}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem' }}>
                          <span style={{
                            fontSize: '16px', fontWeight: 700, padding: '0.2rem 0.65rem',
                            borderRadius: theme.borderRadius.full,
                            backgroundColor: theme.colors.primaryFixed, color: theme.colors.primary,
                          }}>
                            {j.jumlah_prodi}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 1.25rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => setModal({
                                type: 'jurusan',
                                data: { id: j.id, nama_jurusan: j.nama_jurusan },
                              })}
                              title="Edit jurusan"
                              style={actionBtnStyle(theme.colors.primary, theme.colors.primaryFixed)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ type: 'jurusan', id: j.id, nama: j.nama_jurusan })}
                              title="Hapus jurusan"
                              style={actionBtnStyle(theme.colors.error, theme.colors.errorContainer)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>delete</span>
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

          {/* PRODI */}
          <h2 style={{
            fontSize: '15px', fontWeight: 700, color: theme.colors.onSurface,
            margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: theme.colors.primary }}>school</span>
            Prodi
          </h2>
          <div style={{
            backgroundColor: theme.colors.surfaceContainerLowest,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.surfaceContainer}`,
            overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: theme.colors.surfaceContainerLow }}>
                    <th style={{ ...thStyle, textAlign: 'center', width: '60px' }}>#</th>
                    <th style={thStyle}>Nama Prodi</th>
                    <th style={thStyle}>Jurusan</th>
                    <th style={thStyle}>Jumlah Dosen</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProdi.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '36px', color: theme.colors.outlineVariant, display: 'block', marginBottom: '0.5rem' }}>school</span>
                        Belum ada prodi yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredProdi.map((p, idx) => (
                      <tr key={p.id} style={{ borderTop: `1px solid ${theme.colors.surfaceContainer}` }}>
                        <td style={{ ...thStyle, textTransform: 'none', color: theme.colors.outline }}>{idx + 1}</td>
                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '16px', fontWeight: 600, color: theme.colors.onSurface }}>
                          {p.nama_prodi}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '16px', color: theme.colors.onSurfaceVariant }}>
                          {p.nama_jurusan}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '16px', color: theme.colors.onSurfaceVariant }}>
                          {p.jumlah_dosen}
                        </td>
                        <td style={{ padding: '0.6rem 1.25rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => setModal({
                                type: 'prodi',
                                data: { id: p.id, nama_prodi: p.nama_prodi, jurusan_id: String(p.jurusan_id) },
                              })}
                              title="Edit prodi"
                              style={actionBtnStyle(theme.colors.primary, theme.colors.primaryFixed)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ type: 'prodi', id: p.id, nama: p.nama_prodi })}
                              title="Hapus prodi"
                              style={actionBtnStyle(theme.colors.error, theme.colors.errorContainer)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>delete</span>
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
        </>
      )}

      {modal && (
        <EntityFormModal
          key={modal.data ? `edit-${modal.type}-${modal.data.id}` : `create-${modal.type}`}
          type={modal.type}
          initialData={modal.data}
          jurusanList={jurusanList}
          onClose={() => setModal(null)}
          onSubmit={(values) => handleSubmit({ type: modal.type, data: modal.data, ...values })}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Yakin ingin menghapus ${deleteTarget.type} "${deleteTarget.nama}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

const actionBtnStyle = (color, bg) => ({
  width: '34px', height: '34px', borderRadius: theme.borderRadius.full,
  border: `1px solid ${color}`, backgroundColor: bg, color,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
});

export default JurusanProdi;
