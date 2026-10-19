import React, { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';
import theme from '../styles/theme';

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.7rem 0.85rem',
  border: `1px solid ${theme.colors.outlineVariant}`,
  borderRadius: theme.borderRadius.default,
  background: '#fff',
  color: theme.colors.onSurface,
  fontSize: '14px',
  fontFamily: theme.typography.fontFamily.base,
};

export default function ManajemenAkses({ user }) {
  const [campuses, setCampuses] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [prodis, setProdis] = useState([]);
  const [jurusans, setJurusans] = useState([]);
  const [form, setForm] = useState({});
  const [extraAdminForm, setExtraAdminForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isSuperadmin = user.role === 'superadmin';

  const loadData = useCallback(async () => {
    try {
      if (isSuperadmin) {
        const campusResult = await apiJson('/api/tenant/campuses');
        setCampuses(campusResult.data || []);
      } else {
        const [adminResult, prodiResult, jurusanResult] = await Promise.all([
          apiJson('/api/tenant/admins'),
          apiJson('/api/jurusan-prodi/prodi'),
          apiJson('/api/jurusan-prodi/jurusan'),
        ]);
        setAdmins(adminResult.data || []);
        setProdis(prodiResult.data || []);
        setJurusans(jurusanResult.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data pengelolaan akses.');
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const createExtraCampusAdmin = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await apiJson('/api/tenant/admins/campus', {
        method: 'POST',
        body: JSON.stringify(extraAdminForm),
      });
      setNotice(result.message || 'Admin kampus berhasil dibuat.');
      setExtraAdminForm({});
    } catch (err) {
      setError(err.message || 'Gagal membuat admin kampus.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const endpoint = isSuperadmin ? '/api/tenant/campuses' : '/api/tenant/admins/prodi';
      const payload = !isSuperadmin && form.scope_type
        ? {
            ...form,
            [form.scope_type === 'jurusan' ? 'jurusan_id' : 'prodi_id']: form.unit_id,
          }
        : form;
      const result = await apiJson(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setNotice(result.message || 'Akses berhasil diperbarui.');
      setForm({});
      await loadData();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan pengaturan akses.');
    } finally {
      setSaving(false);
    }
  };

  const fields = isSuperadmin
    ? [
        { name: 'nama', label: 'Nama kampus', placeholder: 'Contoh: Universitas Nusantara' },
        { name: 'slug', label: 'Kode URL (opsional)', placeholder: 'otomatis-dari-nama' },
        { name: 'nama_admin', label: 'Nama admin kampus', placeholder: 'Nama administrator' },
        { name: 'email_admin', label: 'Email admin kampus', type: 'email', placeholder: 'admin@kampus.ac.id' },
        { name: 'password_admin', label: 'Password awal admin', type: 'password', minLength: 8, placeholder: 'Minimal 8 karakter' },
      ]
    : [
      { name: 'scope_type', label: 'Jenis lingkup', type: 'scope' },
      { name: 'unit_id', label: 'Jurusan atau prodi', type: 'unit' },
      { name: 'nama', label: 'Nama admin jurusan/prodi', placeholder: 'Nama administrator' },
      { name: 'email', label: 'Email admin', type: 'email', placeholder: 'admin@kampus.ac.id' },
      { name: 'password', label: 'Password awal', type: 'password', minLength: 8, placeholder: 'Minimal 8 karakter' },
    ];

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ margin: '0 0 0.35rem', fontSize: '23px', color: theme.colors.onSurface }}>
          {isSuperadmin ? 'Pengelolaan Kampus' : 'Pengelolaan Admin Jurusan/Prodi'}
        </h1>
        <p style={{ margin: 0, color: theme.colors.onSurfaceVariant, lineHeight: 1.5 }}>
          {isSuperadmin
            ? 'Buat kampus beserta admin kampus pertamanya. Setiap admin kampus hanya mengelola kampusnya.'
            : 'Buat akun admin dengan akses terbatas ke jurusan atau program studi yang ditugaskan.'}
        </p>
      </div>

      {error && <div role="alert" style={{
        padding: '0.8rem 1rem', marginBottom: '1rem', borderRadius: theme.borderRadius.default,
        color: theme.colors.onErrorContainer, backgroundColor: theme.colors.errorContainer,
      }}>{error}</div>}
      {notice && <div role="status" style={{
        padding: '0.8rem 1rem', marginBottom: '1rem', borderRadius: theme.borderRadius.default,
        color: '#065f46', backgroundColor: '#d1fae5',
      }}>{notice}</div>}

      <form onSubmit={handleSubmit} style={{
        padding: '1.25rem', marginBottom: '1.5rem',
        background: '#fff', border: `1px solid ${theme.colors.surfaceContainer}`,
        borderRadius: theme.borderRadius.lg,
      }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '17px', color: theme.colors.onSurface }}>
          {isSuperadmin ? 'Daftarkan Kampus' : 'Buat Admin Jurusan/Prodi'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          {fields.map((field) => (
            <label key={field.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '13px', fontWeight: 700, color: theme.colors.onSurfaceVariant }}>
              {field.label}
              {field.type === 'scope' || field.type === 'unit' ? (
                <select
                  required
                  name={field.name}
                  value={form[field.name] || ''}
                  onChange={(event) => {
                    setForm((current) => field.type === 'scope'
                      ? { ...current, scope_type: event.target.value, unit_id: '' }
                      : { ...current, unit_id: event.target.value });
                  }}
                  style={inputStyle}
                  disabled={field.type === 'unit' && !form.scope_type}
                >
                  <option value="">{field.type === 'scope' ? 'Pilih lingkup' : 'Pilih unit'}</option>
                  {field.type === 'scope' ? (
                    <>
                      <option value="jurusan">Jurusan</option>
                      <option value="prodi">Program Studi</option>
                    </>
                  ) : form.scope_type === 'jurusan' ? (
                    jurusans.map((jurusan) => <option key={jurusan.id} value={jurusan.id}>{jurusan.nama_jurusan}</option>)
                  ) : prodis.map((prodi) => <option key={prodi.id} value={prodi.id}>{prodi.nama_jurusan} — {prodi.nama_prodi}</option>)}
                </select>
              ) : (
                <input
                  required={field.name !== 'slug'}
                  name={field.name}
                  type={field.type || 'text'}
                  minLength={field.minLength}
                  value={form[field.name] || ''}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  style={inputStyle}
                />
              )}
            </label>
          ))}
        </div>
        <button type="submit" disabled={saving} style={{
          marginTop: '1rem', padding: '0.7rem 1.15rem',
          border: 'none', borderRadius: theme.borderRadius.full,
          background: theme.gradients.primaryCta, color: '#fff',
          fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
        }}>{saving ? 'Menyimpan...' : isSuperadmin ? 'Buat Kampus dan Admin' : 'Buat Admin Jurusan/Prodi'}</button>
      </form>

      {isSuperadmin && (
        <form onSubmit={createExtraCampusAdmin} style={{
          padding: '1.25rem', marginBottom: '1.5rem',
          background: '#fff', border: `1px solid ${theme.colors.surfaceContainer}`,
          borderRadius: theme.borderRadius.lg,
        }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '17px', color: theme.colors.onSurface }}>Tambahkan Admin Kampus</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '13px', fontWeight: 700, color: theme.colors.onSurfaceVariant }}>
              Kampus
              <select required name="campus_id" value={extraAdminForm.campus_id || ''} onChange={(event) => setExtraAdminForm((current) => ({ ...current, campus_id: event.target.value }))} style={inputStyle}>
                <option value="">Pilih kampus</option>
                {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.nama}</option>)}
              </select>
            </label>
            {[
              { name: 'nama', label: 'Nama admin', placeholder: 'Nama administrator' },
              { name: 'email', label: 'Email', type: 'email', placeholder: 'admin@kampus.ac.id' },
              { name: 'password', label: 'Password awal', type: 'password', minLength: 8, placeholder: 'Minimal 8 karakter' },
            ].map((field) => (
              <label key={field.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '13px', fontWeight: 700, color: theme.colors.onSurfaceVariant }}>
                {field.label}
                <input required name={field.name} type={field.type || 'text'} minLength={field.minLength} placeholder={field.placeholder} value={extraAdminForm[field.name] || ''} onChange={(event) => setExtraAdminForm((current) => ({ ...current, [field.name]: event.target.value }))} style={inputStyle} />
              </label>
            ))}
          </div>
          <button type="submit" disabled={saving} style={{
            marginTop: '1rem', padding: '0.7rem 1.15rem',
            border: 'none', borderRadius: theme.borderRadius.full,
            background: theme.gradients.primaryCta, color: '#fff',
            fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
          }}>{saving ? 'Menyimpan...' : 'Tambahkan Admin Kampus'}</button>
        </form>
      )}

      <section style={{
        overflow: 'hidden', background: '#fff',
        border: `1px solid ${theme.colors.surfaceContainer}`,
        borderRadius: theme.borderRadius.lg,
      }}>
        <h2 style={{ margin: 0, padding: '1rem 1.2rem', fontSize: '17px', color: theme.colors.onSurface }}>
          {isSuperadmin ? `Kampus Terdaftar (${campuses.length})` : `Admin Kampus & Unit (${admins.length})`}
        </h2>
        {loading ? <p style={{ padding: '0 1.2rem 1rem', color: theme.colors.onSurfaceVariant }}>Memuat...</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: theme.colors.surfaceContainerLow }}>
                {(isSuperadmin ? ['Kampus', 'Kode', 'Jurusan', 'Dosen'] : ['Email', 'Peran', 'Jurusan', 'Prodi']).map((label) => (
                  <th key={label} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: theme.colors.onSurfaceVariant, fontSize: '12px' }}>{label}</th>
                ))}
              </tr></thead>
              <tbody>
                {(isSuperadmin ? campuses : admins).map((row) => (
                  <tr key={row.id} style={{ borderTop: `1px solid ${theme.colors.surfaceContainer}` }}>
                    {(isSuperadmin
                      ? [row.nama, row.slug, row.jumlah_jurusan, row.jumlah_dosen]
                      : [row.email, row.role === 'admin_kampus' ? 'Admin Kampus' : row.managed_prodi_id ? 'Admin Prodi' : 'Admin Jurusan', row.nama_jurusan || '-', row.nama_prodi || '-']
                    ).map((value, index) => <td key={index} style={{ padding: '0.8rem 1rem', color: theme.colors.onSurface, fontSize: '14px' }}>{value}</td>)}
                  </tr>
                ))}
                {!((isSuperadmin ? campuses : admins).length) && (
                  <tr><td colSpan={4} style={{ padding: '1.25rem', color: theme.colors.onSurfaceVariant }}>Belum ada data untuk ditampilkan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
