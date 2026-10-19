import React, { useState, useEffect, useCallback } from 'react';
import theme from '../styles/theme';
import { apiJson, getToken } from '../lib/api';

const HARI = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
const EMPTY_FORM = { dosen_id: '', hari: 'senin', jam_mulai: '', jam_selesai: '', mata_kuliah: '', gedung_id: '' };

const fieldStyle = {
  width: '100%', padding: '0.6rem 0.85rem', borderRadius: theme.borderRadius.default,
  border: `1px solid ${theme.colors.outlineVariant}`, backgroundColor: theme.colors.surfaceContainerLowest,
  fontSize: '16px', color: theme.colors.onSurface, fontFamily: theme.typography.fontFamily.base,
  outline: 'none', boxSizing: 'border-box',
};

const thStyle = {
  padding: '0.85rem 1.25rem', textAlign: 'left', fontSize: '16px', fontWeight: 700,
  color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
};

export default function ManajemenJadwal() {
  const [list, setList] = useState([]);
  const [dosenList, setDosenList] = useState([]);
  const [gedungList, setGedungList] = useState([]);
  const [filterProdi, setFilterProdi] = useState('');
  const [modal, setModal] = useState(null); // {data} edit or {data:null}
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prodiList, setProdiList] = useState([]);
  const [optionErrors, setOptionErrors] = useState({});

  const flash = useCallback((msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterProdi) params.append('prodi_id', filterProdi);
    const results = await Promise.allSettled([
      apiJson(`/api/jadwal-mengajar?${params}`),
      apiJson('/api/dosen?limit=1000'),
      apiJson('/api/gedung'),
      apiJson('/api/jurusan-prodi/prodi'),
    ]);
    const [jadwalResult, dosenResult, gedungResult, prodiResult] = results;
    const nextOptionErrors = {};

    if (jadwalResult.status === 'fulfilled') setList(jadwalResult.value.data || []);
    else flash(`Gagal memuat jadwal: ${jadwalResult.reason.message}`, 'error');

    if (dosenResult.status === 'fulfilled') setDosenList(dosenResult.value.data || []);
    else {
      setDosenList([]);
      nextOptionErrors.dosen = dosenResult.reason.message || 'Gagal memuat daftar dosen.';
    }

    if (gedungResult.status === 'fulfilled') setGedungList(gedungResult.value.data || []);
    else {
      setGedungList([]);
      nextOptionErrors.gedung = gedungResult.reason.message || 'Gagal memuat daftar gedung.';
    }

    if (prodiResult.status === 'fulfilled') setProdiList(prodiResult.value.data || []);
    else flash(`Gagal memuat program studi: ${prodiResult.reason.message}`, 'error');

    setOptionErrors(nextOptionErrors);
    if (Object.keys(nextOptionErrors).length) {
      flash('Daftar dosen atau gedung gagal dimuat. Periksa pesan di form jadwal.', 'error');
    }
    setLoading(false);
  }, [filterProdi, flash]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (form) => {
    const editing = Boolean(form.id);
    try {
      const result = await apiJson(editing ? `/api/jadwal-mengajar/${form.id}` : '/api/jadwal-mengajar', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      flash(result.message);
      setModal(null);
      fetchAll();
    } catch (err) { flash(err.message, 'error'); }
  };

  const handleDelete = async () => {
    try {
      const result = await apiJson(`/api/jadwal-mengajar/${deleteTarget.id}`, { method: 'DELETE' });
      flash(result.message);
      fetchAll();
    } catch (err) { flash(err.message, 'error'); } finally { setDeleteTarget(null); }
  };

  const handleImport = async (file) => {
    setImporting(true); setImportError(''); setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/jadwal-mengajar/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Import gagal');
      setImportResult(data);
      fetchAll();
    } catch (err) { setImportError(err.message); } finally { setImporting(false); }
  };

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 300, padding: '0.85rem 1.25rem', borderRadius: theme.borderRadius.default, backgroundColor: toast.type === 'error' ? theme.colors.errorContainer : '#ecfdf5', color: toast.type === 'error' ? theme.colors.onErrorContainer : '#047857', boxShadow: theme.shadows.card, fontSize: '16px', fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: theme.colors.onSurface, margin: '0 0 0.25rem 0' }}>Manajemen Jadwal Mengajar</h1>
          <p style={{ margin: 0, fontSize: '16px', color: theme.colors.onSurfaceVariant }}>Kelola jadwal mengajar dosen per hari dan gedung.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => { setImportOpen(true); setImportResult(null); setImportError(''); }} style={{ padding: '0.7rem 1.2rem', borderRadius: theme.borderRadius.full, border: `1px solid ${theme.colors.primary}`, backgroundColor: theme.colors.primaryFixed, color: theme.colors.primary, fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>
            Import CSV/Excel
          </button>
          <button type="button" onClick={() => { setModal({ data: null }); fetchAll(); }} style={{ padding: '0.7rem 1.4rem', borderRadius: theme.borderRadius.full, border: 'none', background: theme.gradients.primaryCta, color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer', boxShadow: theme.shadows.btnPrimary }}>
            + Tambah Jadwal
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select value={filterProdi} onChange={(e) => setFilterProdi(e.target.value)} style={{ ...fieldStyle, width: 'auto' }}>
          <option value="">Semua Prodi</option>
          {prodiList.map((p) => <option key={p.id} value={p.id}>{p.nama_prodi}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.surfaceContainer}`, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: theme.colors.surfaceContainerLow }}>
                <th style={thStyle}>Hari</th><th style={thStyle}>Jam</th><th style={thStyle}>Dosen</th><th style={thStyle}>Mata Kuliah</th><th style={thStyle}>Gedung</th><th style={{ ...thStyle, textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>Memuat...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>Belum ada jadwal.</td></tr>
              ) : list.map((j) => (
                <tr key={j.id} style={{ borderTop: `1px solid ${theme.colors.surfaceContainer}` }}>
                  <td style={{ padding: '0.85rem 1.25rem', fontSize: '16px', textTransform: 'capitalize' }}>{j.hari}</td>
                  <td style={{ padding: '0.85rem 1.25rem', fontSize: '16px' }}>{String(j.jam_mulai).slice(0, 5)}–{String(j.jam_selesai).slice(0, 5)}</td>
                  <td style={{ padding: '0.85rem 1.25rem', fontSize: '16px', fontWeight: 600 }}>{j.nama_dosen}</td>
                  <td style={{ padding: '0.85rem 1.25rem', fontSize: '16px' }}>{j.mata_kuliah}</td>
                  <td style={{ padding: '0.85rem 1.25rem', fontSize: '16px' }}>{j.nama_gedung}</td>
                  <td style={{ padding: '0.6rem 1.25rem', textAlign: 'right' }}>
                    <button type="button" onClick={() => setModal({ data: j })} style={{ marginRight: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.primary }}>edit</button>
                    <button type="button" onClick={() => setDeleteTarget(j)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.error }}>delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <JadwalFormModal data={modal.data} dosenList={dosenList} gedungList={gedungList} optionErrors={optionErrors} loadingOptions={loading} onClose={() => setModal(null)} onSubmit={handleSubmit} />}

      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(17,28,45,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: theme.borderRadius.lg, padding: '2rem', maxWidth: '380px', width: '90%' }}>
            <p style={{ fontSize: '16px', color: theme.colors.onSurfaceVariant }}>Hapus jadwal "{deleteTarget.mata_kuliah}" ({deleteTarget.nama_dosen}, {deleteTarget.hari})?</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setDeleteTarget(null)} style={{ padding: '0.6rem 1.25rem', borderRadius: theme.borderRadius.full, border: `1px solid ${theme.colors.outlineVariant}`, background: 'transparent', cursor: 'pointer' }}>Batal</button>
              <button type="button" onClick={handleDelete} style={{ padding: '0.6rem 1.25rem', borderRadius: theme.borderRadius.full, border: 'none', backgroundColor: theme.colors.error, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {importOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(17,28,45,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: theme.borderRadius.lg, padding: '2rem', maxWidth: '460px', width: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Import Jadwal dari CSV/Excel</h3>
            <p style={{ fontSize: '16px', color: theme.colors.onSurfaceVariant }}>
              Kolom: nip_dosen, hari, jam_mulai, jam_selesai, mata_kuliah, nama_gedung.{' '}
              <a href="/api/jadwal-mengajar/template" style={{ color: theme.colors.primary, fontWeight: 700 }} download>Download Template CSV</a>
            </p>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files[0] && handleImport(e.target.files[0])} />
            {importing && <p style={{ fontSize: '16px' }}>Mengupload & memproses...</p>}
            {importError && <p style={{ color: theme.colors.error, fontSize: '16px' }}>{importError}</p>}
            {importResult && (
              <div style={{ fontSize: '16px', marginTop: '0.75rem' }}>
                <p style={{ margin: '0.25rem 0' }}>✅ Berhasil: <b>{importResult.berhasil}</b> baris</p>
                <p style={{ margin: '0.25rem 0' }}>❌ Gagal: <b>{importResult.gagal_count}</b> baris</p>
                {importResult.gagal?.length > 0 && (
                  <ul style={{ maxHeight: '140px', overflowY: 'auto', paddingLeft: '1.25rem', color: theme.colors.error }}>
                    {importResult.gagal.map((g, i) => <li key={i}>Baris {g.baris}: {g.alasan}</li>)}
                  </ul>
                )}
              </div>
            )}
            <div style={{ textAlign: 'right', marginTop: '1rem' }}>
              <button type="button" onClick={() => setImportOpen(false)} style={{ padding: '0.6rem 1.25rem', borderRadius: theme.borderRadius.full, border: `1px solid ${theme.colors.outlineVariant}`, background: 'transparent', cursor: 'pointer' }}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JadwalFormModal({ data, dosenList, gedungList, optionErrors, loadingOptions, onClose, onSubmit }) {
  const [form, setForm] = useState(() => data
    ? { id: data.id, dosen_id: data.dosen_id, hari: data.hari, jam_mulai: String(data.jam_mulai).slice(0, 5), jam_selesai: String(data.jam_selesai).slice(0, 5), mata_kuliah: data.mata_kuliah, gedung_id: data.gedung_id }
    : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.dosen_id || !form.gedung_id || !form.mata_kuliah.trim() || !form.jam_mulai || !form.jam_selesai) {
      setError('Semua field wajib diisi.'); return;
    }
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(17,28,45,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: theme.borderRadius.lg, padding: '2rem', maxWidth: '460px', width: '90%', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <h3 style={{ margin: 0 }}>{data ? 'Edit Jadwal' : 'Tambah Jadwal'}</h3>
        {optionErrors.dosen && <div role="alert" style={{ color: theme.colors.error, fontSize: '14px' }}>Daftar dosen gagal dimuat: {optionErrors.dosen}</div>}
        <select value={form.dosen_id} onChange={handleChange('dosen_id')} style={fieldStyle}>
          <option value="">{loadingOptions ? 'Memuat daftar dosen...' : dosenList.length ? '-- Pilih Dosen --' : 'Belum ada dosen di cakupan ini'}</option>
          {dosenList.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
        </select>
        {!loadingOptions && !optionErrors.dosen && dosenList.length === 0 && (
          <div style={{ color: theme.colors.onSurfaceVariant, fontSize: '13px' }}>
            Tambahkan dosen terlebih dahulu melalui menu Manajemen Dosen.
          </div>
        )}
        <select value={form.hari} onChange={handleChange('hari')} style={fieldStyle}>
          {HARI.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input type="time" value={form.jam_mulai} onChange={handleChange('jam_mulai')} style={fieldStyle} />
          <input type="time" value={form.jam_selesai} onChange={handleChange('jam_selesai')} style={fieldStyle} />
        </div>
        <input placeholder="Mata Kuliah" value={form.mata_kuliah} onChange={handleChange('mata_kuliah')} style={fieldStyle} />
        {optionErrors.gedung && <div role="alert" style={{ color: theme.colors.error, fontSize: '14px' }}>Daftar gedung gagal dimuat: {optionErrors.gedung}</div>}
        <select value={form.gedung_id} onChange={handleChange('gedung_id')} style={fieldStyle}>
          <option value="">{loadingOptions ? 'Memuat daftar gedung...' : gedungList.length ? '-- Pilih Gedung --' : 'Belum ada gedung di kampus ini'}</option>
          {gedungList.map((g) => <option key={g.id} value={g.id}>{g.nama_gedung}</option>)}
        </select>
        {!loadingOptions && !optionErrors.gedung && gedungList.length === 0 && (
          <div style={{ color: theme.colors.onSurfaceVariant, fontSize: '13px' }}>
            Tambahkan gedung terlebih dahulu melalui menu Manajemen Gedung.
          </div>
        )}
        {error && <div style={{ color: theme.colors.error, fontSize: '16px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '0.6rem 1.25rem', borderRadius: theme.borderRadius.full, border: `1px solid ${theme.colors.outlineVariant}`, background: 'transparent', cursor: 'pointer' }}>Batal</button>
          <button type="submit" disabled={saving} style={{ padding: '0.6rem 1.25rem', borderRadius: theme.borderRadius.full, border: 'none', background: theme.gradients.primaryCta, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </form>
    </div>
  );
}
