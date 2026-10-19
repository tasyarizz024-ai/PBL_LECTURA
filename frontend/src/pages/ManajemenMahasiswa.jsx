import React, { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';
import theme from '../styles/theme';

const EMPTY_FORM = { nama: '', nim: '', email: '', prodi_id: '', password: '' };

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.7rem 0.9rem',
  borderRadius: theme.borderRadius.default,
  border: `1px solid ${theme.colors.outlineVariant}`,
  backgroundColor: theme.colors.surfaceContainerLowest,
  color: theme.colors.onSurface,
  fontSize: '15px',
  fontFamily: theme.typography.fontFamily.base,
};

const thStyle = {
  padding: '0.85rem 1rem',
  textAlign: 'left',
  fontSize: '13px',
  fontWeight: 700,
  color: theme.colors.onSurfaceVariant,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
};

export default function ManajemenMahasiswa() {
  const [students, setStudents] = useState([]);
  const [prodis, setProdis] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const fetchStudents = useCallback(async () => {
    try {
      const result = await apiJson('/api/mahasiswa');
      setStudents(result.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data mahasiswa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([apiJson('/api/mahasiswa'), apiJson('/api/jurusan-prodi/prodi')])
      .then(([result, prodiResult]) => {
        if (active) {
          setStudents(result.data || []);
          setProdis(prodiResult.data || []);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Gagal memuat data mahasiswa.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const result = await apiJson('/api/mahasiswa', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm(EMPTY_FORM);
      setNotice(result.message || 'Akun mahasiswa berhasil ditambahkan.');
      await fetchStudents();
    } catch (err) {
      setError(err.message || 'Gagal menambahkan akun mahasiswa.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    [student.nama, student.nim, student.email, student.prodi]
      .some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.35rem', fontSize: '24px', fontWeight: 800, color: theme.colors.onSurface }}>
          Manajemen Mahasiswa
        </h1>
        <p style={{ margin: 0, color: theme.colors.onSurfaceVariant }}>
          Admin membuat akun mahasiswa kampus. Pendaftaran mandiri tidak tersedia.
        </p>
      </div>

      {error && (
        <div role="alert" style={{
          padding: '0.85rem 1rem', marginBottom: '1rem', borderRadius: theme.borderRadius.default,
          color: theme.colors.onErrorContainer, backgroundColor: theme.colors.errorContainer,
        }}>
          {error}
        </div>
      )}
      {notice && (
        <div role="status" style={{
          padding: '0.85rem 1rem', marginBottom: '1rem', borderRadius: theme.borderRadius.default,
          color: '#065f46', backgroundColor: '#d1fae5',
        }}>
          {notice}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          padding: '1.4rem',
          marginBottom: '1.5rem',
          backgroundColor: theme.colors.surfaceContainerLowest,
          border: `1px solid ${theme.colors.surfaceContainer}`,
          borderRadius: theme.borderRadius.lg,
        }}
      >
        <h2 style={{ margin: '0 0 1rem', fontSize: '18px', color: theme.colors.onSurface }}>
          Tambah Akun Mahasiswa
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
          {[
            { name: 'nama', label: 'Nama lengkap', placeholder: 'Nama mahasiswa' },
            { name: 'nim', label: 'NIM', placeholder: 'Nomor induk mahasiswa' },
            { name: 'email', label: 'Email kampus', placeholder: 'nama@kampus.ac.id', type: 'email' },
            { name: 'password', label: 'Password awal', placeholder: 'Minimal 8 karakter', type: 'password', minLength: 8 },
          ].map((field) => (
            <label key={field.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '14px', fontWeight: 700, color: theme.colors.onSurfaceVariant }}>
              {field.label}
              <input
                required
                name={field.name}
                type={field.type || 'text'}
                minLength={field.minLength}
                maxLength={field.name === 'nama' ? 100 : field.name === 'nim' ? 20 : field.name === 'email' ? 100 : field.name === 'prodi' ? 50 : undefined}
                value={form[field.name]}
                onChange={handleChange}
                placeholder={field.placeholder}
                style={inputStyle}
              />
            </label>
          ))}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '14px', fontWeight: 700, color: theme.colors.onSurfaceVariant }}>
            Program studi *
            <select required name="prodi_id" value={form.prodi_id} onChange={handleChange} style={inputStyle}>
              <option value="">Pilih prodi</option>
              {prodis.map((prodi) => (
                <option key={prodi.id} value={prodi.id}>{prodi.nama_jurusan} — {prodi.nama_prodi}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
            marginTop: '1rem', padding: '0.7rem 1.2rem', border: 'none',
            borderRadius: theme.borderRadius.full, background: theme.gradients.primaryCta,
            color: '#fff', fontSize: '15px', fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
            fontFamily: theme.typography.fontFamily.base,
            opacity: saving ? 0.7 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>person_add</span>
          {saving ? 'Menyimpan...' : 'Tambahkan Akun'}
        </button>
      </form>

      <section style={{
        backgroundColor: theme.colors.surfaceContainerLowest,
        border: `1px solid ${theme.colors.surfaceContainer}`,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '17px', color: theme.colors.onSurface }}>Daftar Akun ({students.length})</h2>
          <input
            aria-label="Cari mahasiswa"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama, NIM, email, atau prodi"
            style={{ ...inputStyle, width: 'min(100%, 340px)' }}
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: theme.colors.surfaceContainerLow }}>
                {['Nama', 'NIM', 'Email', 'Program Studi'].map((heading) => <th key={heading} style={thStyle}>{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>Memuat data mahasiswa...</td></tr>
              ) : filteredStudents.length ? filteredStudents.map((student) => (
                <tr key={student.id} style={{ borderTop: `1px solid ${theme.colors.surfaceContainer}` }}>
                  {[student.nama, student.nim, student.email, student.prodi].map((value, index) => (
                    <td key={index} style={{ padding: '0.85rem 1rem', fontSize: '14px', color: theme.colors.onSurface }}>{value || '-'}</td>
                  ))}
                </tr>
              )) : (
                <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                  {search ? 'Tidak ada mahasiswa yang cocok.' : 'Belum ada akun mahasiswa.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
