import React, { useState, useEffect, useCallback } from 'react';
import { apiJson } from '../lib/api';
import theme from '../styles/theme';
import GedungMapPicker from '../components/GedungMapPicker';

const EMPTY_FORM = {
  nama_gedung: '',
  latitude: '',
  longitude: '',
  radius_meter: '100',
  alamat: '',
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
        <p style={{ fontSize: '14px', color: theme.colors.onSurfaceVariant, marginBottom: '1.5rem', lineHeight: 1.6 }}>
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
              fontSize: '13px', fontWeight: 600,
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
              cursor: 'pointer', fontSize: '13px', fontWeight: 700,
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

function GedungFormModal({ isOpen, gedungData, onClose, onSaved }) {
  // State form diinisialisasi langsung dari props. Parent me-remount komponen
  // ini lewat `key` setiap kali modal dibuka, jadi tidak perlu efek untuk
  // menyalin props → state (dan tidak ada flash nilai form sebelumnya).
  const [form, setForm] = useState(() =>
    gedungData
      ? {
          nama_gedung: gedungData.nama_gedung || '',
          latitude: gedungData.latitude != null ? String(gedungData.latitude) : '',
          longitude: gedungData.longitude != null ? String(gedungData.longitude) : '',
          radius_meter: gedungData.radius_meter != null ? String(gedungData.radius_meter) : '100',
          alamat: gedungData.alamat || '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama_gedung.trim()) { setError('Nama gedung wajib diisi.'); return; }
    if (!form.latitude || !form.longitude) { setError('Koordinat (latitude & longitude) wajib diisi.'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        nama_gedung: form.nama_gedung.trim(),
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius_meter: parseInt(form.radius_meter, 10) || 100,
        alamat: form.alamat.trim() || null,
      };
      // Backend mengembalikan kolom primary key sebagai `id`.
      const url = gedungData ? `/api/gedung/${gedungData.id ?? gedungData.gedung_id}` : '/api/gedung';
      const method = gedungData ? 'PUT' : 'POST';
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
    fontSize: '14px',
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
            {gedungData ? 'Edit Data Gedung' : 'Tambah Gedung Baru'}
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
            <label style={{ fontSize: '12px', fontWeight: 700, color: theme.colors.onSurfaceVariant, display: 'block', marginBottom: '0.4rem' }}>
              Nama Gedung *
            </label>
            <input value={form.nama_gedung} onChange={handleChange('nama_gedung')} placeholder="Gedung A / Gedung Rektorat" style={fieldStyle} />
          </div>

          {/* Coordinate inputs */}
          <div
            style={{
              backgroundColor: theme.colors.surfaceContainerLow,
              borderRadius: theme.borderRadius.default,
              padding: '1rem',
              border: `1px solid ${theme.colors.surfaceContainer}`,
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: theme.colors.onSurfaceVariant, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span>
              Koordinat Geofence *
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <GedungMapPicker
                latitude={form.latitude}
                longitude={form.longitude}
                radiusMeter={form.radius_meter}
                onChange={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: theme.colors.onSurfaceVariant, display: 'block', marginBottom: '0.3rem' }}>
                Radius Geofence (meter)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={10}
                  value={form.radius_meter}
                  onChange={handleChange('radius_meter')}
                  style={{ flex: 1, accentColor: theme.colors.primary }}
                />
                <div
                  style={{
                    minWidth: '64px',
                    padding: '0.35rem 0.75rem',
                    backgroundColor: theme.colors.primaryFixed,
                    color: theme.colors.primary,
                    borderRadius: theme.borderRadius.full,
                    fontSize: '13px',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  {form.radius_meter} m
                </div>
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: theme.colors.onSurfaceVariant, display: 'block', marginBottom: '0.4rem' }}>
              Alamat (opsional)
            </label>
            <input value={form.alamat} onChange={handleChange('alamat')} placeholder="Jl. Mayjend Haryono No. 167..." style={fieldStyle} />
          </div>

          {error && (
            <div
              style={{
                backgroundColor: theme.colors.errorContainer,
                color: theme.colors.onErrorContainer,
                borderRadius: theme.borderRadius.default,
                padding: '0.75rem 1rem',
                fontSize: '13px',
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
                fontSize: '13px', fontWeight: 600,
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
                fontSize: '13px', fontWeight: 700,
                fontFamily: theme.typography.fontFamily.base,
                boxShadow: saving ? 'none' : theme.shadows.btnPrimary,
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              {saving && <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>progress_activity</span>}
              {saving ? 'Menyimpan...' : gedungData ? 'Simpan Perubahan' : 'Tambah Gedung'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManajemenGedung() {
  const [gedungList, setGedungList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editGedung, setEditGedung] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchGedung = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson('/api/gedung');
      if (data.success) setGedungList(data.data || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  // Fetch daftar gedung saat halaman dibuka (menyinkronkan dengan server).
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => { fetchGedung(); }, [fetchGedung]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiJson(`/api/gedung/${deleteTarget.id ?? deleteTarget.gedung_id}`, {
        method: 'DELETE',
      });
      showToast(`Gedung "${deleteTarget.nama_gedung}" berhasil dihapus.`);
      fetchGedung();
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
            fontSize: '13px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '0.5rem',
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
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: theme.colors.onSurface, margin: '0 0 0.25rem 0' }}>Manajemen Gedung & Geofence</h1>
          <p style={{ margin: 0, fontSize: '13px', color: theme.colors.onSurfaceVariant }}>
            Kelola data gedung kampus dan zona geofence pelacakan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditGedung(null); setModalOpen(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.7rem 1.4rem',
            borderRadius: theme.borderRadius.full,
            border: 'none',
            background: theme.gradients.primaryCta,
            color: '#fff', cursor: 'pointer',
            fontSize: '13px', fontWeight: 700,
            fontFamily: theme.typography.fontFamily.base,
            boxShadow: theme.shadows.btnPrimary,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_location_alt</span>
          Tambah Gedung
        </button>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: theme.colors.onSurfaceVariant }}>
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '36px', color: theme.colors.primary }}>progress_activity</span>
        </div>
      ) : gedungList.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: theme.colors.surfaceContainerLowest,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.surfaceContainer}`,
            color: theme.colors.onSurfaceVariant,
            fontSize: '13px',
          }}
        >
          Belum ada gedung yang terdaftar.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {gedungList.map((g) => (
            <div
              key={g.id}
              style={{
                backgroundColor: theme.colors.surfaceContainerLowest,
                borderRadius: theme.borderRadius.lg,
                border: `1px solid ${theme.colors.surfaceContainer}`,
                boxShadow: theme.shadows.cardSm,
                overflow: 'hidden',
              }}
            >
              {/* Card top stripe */}
              <div
                style={{
                  height: '6px',
                  background: theme.gradients.primaryCta,
                }}
              />
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div
                    style={{
                      width: '42px', height: '42px', flexShrink: 0,
                      borderRadius: theme.borderRadius.default,
                      backgroundColor: theme.colors.primaryFixed,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color: theme.colors.primary }}>location_city</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: theme.colors.onSurface, margin: '0 0 0.2rem 0', wordBreak: 'break-word' }}>
                      {g.nama_gedung}
                    </h3>
                    {g.alamat && (
                      <p style={{ fontSize: '12px', color: theme.colors.onSurfaceVariant, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {g.alamat}
                      </p>
                    )}
                  </div>
                </div>

                {/* Coordinates & Radius */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: theme.colors.outline, fontWeight: 600 }}>Koordinat</span>
                    <span style={{ fontSize: '12px', color: theme.colors.onSurfaceVariant, fontFamily: 'monospace' }}>
                      {g.latitude != null ? Number(g.latitude).toFixed(5) : '—'}, {g.longitude != null ? Number(g.longitude).toFixed(5) : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: theme.colors.outline, fontWeight: 600 }}>Radius Geofence</span>
                    <span
                      style={{
                        fontSize: '12px', fontWeight: 700,
                        padding: '0.15rem 0.6rem',
                        borderRadius: theme.borderRadius.full,
                        backgroundColor: theme.colors.primaryFixed,
                        color: theme.colors.primary,
                      }}
                    >
                      {g.radius_meter ?? '—'} m
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => { setEditGedung(g); setModalOpen(true); }}
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                      padding: '0.55rem',
                      borderRadius: theme.borderRadius.full,
                      border: `1px solid ${theme.colors.primary}`,
                      backgroundColor: theme.colors.primaryFixed,
                      color: theme.colors.primary,
                      cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                      fontFamily: theme.typography.fontFamily.base,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(g)}
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                      padding: '0.55rem',
                      borderRadius: theme.borderRadius.full,
                      border: `1px solid ${theme.colors.error}`,
                      backgroundColor: theme.colors.errorContainer,
                      color: theme.colors.error,
                      cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                      fontFamily: theme.typography.fontFamily.base,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span>
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {modalOpen && (
      <GedungFormModal
        key={editGedung ? `edit-${editGedung.id}` : 'create'}
        isOpen={modalOpen}
        gedungData={editGedung}
        onClose={() => { setModalOpen(false); setEditGedung(null); }}
        onSaved={() => {
          fetchGedung();
          showToast(editGedung ? 'Data gedung berhasil diperbarui.' : 'Gedung baru berhasil ditambahkan.');
        }}
      />
      )}

      {/* Confirm Delete */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Yakin ingin menghapus gedung "${deleteTarget.nama_gedung}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
