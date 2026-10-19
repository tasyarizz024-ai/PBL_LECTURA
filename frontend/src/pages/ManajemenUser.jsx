import React, { useState, useEffect } from 'react';
import { apiJson, getStoredUser } from '../lib/api';
import theme from '../styles/theme';

export default function ManajemenUser() {
  const currentUser = getStoredUser();

  const [users, setUsers] = useState([]);
  const [prodiList, setProdiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'mahasiswa' | 'dosen' | 'admin'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Add User
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [selectedRole, setSelectedRole] = useState('mahasiswa');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    // Dosen
    nip: '',
    prodi_id: '',
    jabatan: 'Asisten Ahli',
    // Mahasiswa
    nim: '',
    prodi: '',
    // Shared
    nama: '',
  });

  // Modal Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch Users & Prodi list
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const queryParams = new URLSearchParams();
      if (roleFilter !== 'all') queryParams.append('role', roleFilter);
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());

      const res = await apiJson(`/api/admin/users?${queryParams.toString()}`);
      setUsers(res.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar pengguna.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProdiList = async () => {
    try {
      const res = await apiJson('/api/admin/users/meta/prodi');
      setProdiList(res.data || []);
      if (res.data?.length > 0 && !formData.prodi_id) {
        setFormData((prev) => ({ ...prev, prodi_id: res.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch prodi list:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  useEffect(() => {
    fetchProdiList();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleOpenAddModal = () => {
    setFormError('');
    setSelectedRole('mahasiswa');
    setFormData({
      email: '',
      password: '',
      nip: '',
      prodi_id: prodiList.length > 0 ? prodiList[0].id : '',
      jabatan: 'Asisten Ahli',
      nim: '',
      prodi: prodiList.length > 0 ? prodiList[0].nama_prodi : '',
      nama: '',
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.email || !formData.password) {
      setFormError('Email dan password wajib diisi.');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Password minimal harus 6 karakter.');
      return;
    }

    if (selectedRole === 'dosen') {
      if (!formData.nip || !formData.nama || !formData.prodi_id) {
        setFormError('NIP, Nama Lengkap, dan Program Studi wajib diisi untuk Dosen.');
        return;
      }
    } else if (selectedRole === 'mahasiswa') {
      if (!formData.nim || !formData.nama) {
        setFormError('NIM dan Nama Lengkap wajib diisi untuk Mahasiswa.');
        return;
      }
    }

    setFormSubmitting(true);
    try {
      const payload = {
        role: selectedRole,
        email: formData.email,
        password: formData.password,
        nama: formData.nama,
      };

      if (selectedRole === 'dosen') {
        payload.nip = formData.nip;
        payload.prodi_id = formData.prodi_id;
        payload.jabatan = formData.jabatan;
      } else if (selectedRole === 'mahasiswa') {
        payload.nim = formData.nim;
        payload.prodi = formData.prodi || (prodiList.find(p => p.id === Number(formData.prodi_id))?.nama_prodi || '');
      }

      const res = await apiJson('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessMsg(res.message || 'Pengguna berhasil ditambahkan!');
      setIsModalOpen(false);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setFormError(err.message || 'Gagal menambahkan pengguna.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await apiJson(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      setSuccessMsg(res.message || 'Pengguna berhasil dihapus.');
      setDeleteTarget(null);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Gagal menghapus pengguna.');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Helper counters
  const counts = {
    all: users.length,
    mahasiswa: users.filter((u) => u.role === 'mahasiswa').length,
    dosen: users.filter((u) => u.role === 'dosen').length,
    admin: users.filter((u) => u.role === 'admin').length,
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header section */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          backgroundColor: theme.colors.surfaceContainerLowest,
          padding: '1.5rem 1.75rem',
          borderRadius: theme.borderRadius.xl,
          border: `1px solid ${theme.colors.surfaceContainer}`,
          boxShadow: theme.shadows.cardSm,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '26px', color: theme.colors.primary }}>
              manage_accounts
            </span>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: theme.colors.onSurface, margin: 0 }}>
              Manajemen Pengguna
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: theme.colors.onSurfaceVariant }}>
            Tambah akun baru dan kelola hak akses Mahasiswa, Dosen, serta Administrator
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.4rem',
            borderRadius: theme.borderRadius.full,
            border: 'none',
            background: theme.gradients.primaryCta,
            color: '#fff',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: theme.shadows.btnPrimary,
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            person_add
          </span>
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.9rem 1.25rem',
            backgroundColor: '#d1fae5',
            color: '#065f46',
            borderRadius: theme.borderRadius.default,
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: theme.shadows.cardSm,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            check_circle
          </span>
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.9rem 1.25rem',
            backgroundColor: theme.colors.errorContainer,
            color: theme.colors.onErrorContainer,
            borderRadius: theme.borderRadius.default,
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: theme.shadows.cardSm,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            error
          </span>
          <span>{error}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Role Pills */}
        <div
          style={{
            display: 'flex',
            backgroundColor: theme.colors.surfaceContainerLowest,
            borderRadius: theme.borderRadius.full,
            padding: '4px',
            border: `1px solid ${theme.colors.surfaceContainer}`,
            boxShadow: theme.shadows.cardSm,
          }}
        >
          {[
            { key: 'all', label: 'Semua User', icon: 'groups' },
            { key: 'mahasiswa', label: 'Mahasiswa', icon: 'school' },
            { key: 'dosen', label: 'Dosen', icon: 'co_present' },
            { key: 'admin', label: 'Admin', icon: 'admin_panel_settings' },
          ].map((tab) => {
            const isActive = roleFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setRoleFilter(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  borderRadius: theme.borderRadius.full,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  transition: 'all 0.18s ease',
                  backgroundColor: isActive ? theme.colors.primary : 'transparent',
                  color: isActive ? '#ffffff' : theme.colors.onSurfaceVariant,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px',
                color: theme.colors.outline,
              }}
            >
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, email, NIM/NIP..."
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                borderRadius: theme.borderRadius.full,
                border: `1px solid ${theme.colors.surfaceContainer}`,
                backgroundColor: theme.colors.surfaceContainerLowest,
                fontSize: '13px',
                color: theme.colors.onSurface,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.6rem 1rem',
              borderRadius: theme.borderRadius.full,
              border: `1px solid ${theme.colors.primary}`,
              backgroundColor: theme.colors.primaryFixed,
              color: theme.colors.primary,
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cari
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div
        style={{
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderRadius: theme.borderRadius.xl,
          border: `1px solid ${theme.colors.surfaceContainer}`,
          boxShadow: theme.shadows.cardSm,
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
            <span
              className="material-symbols-outlined animate-spin"
              style={{ fontSize: '32px', color: theme.colors.primary }}
            >
              progress_activity
            </span>
            <p style={{ marginTop: '0.75rem', fontSize: '14px' }}>Memuat data pengguna...</p>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: theme.colors.outline }}>
              person_off
            </span>
            <h3 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '16px', color: theme.colors.onSurface }}>
              Tidak ada pengguna ditemukan
            </h3>
            <p style={{ margin: 0, fontSize: '13px' }}>
              Coba sesuaikan kata kunci pencarian atau tambahkan pengguna baru.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: theme.colors.surfaceContainerLow,
                    borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
                    color: theme.colors.onSurfaceVariant,
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '1rem 1.25rem' }}>Pengguna</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Role</th>
                  <th style={{ padding: '1rem 1.25rem' }}>NIM / NIP</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Program Studi / Info</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Terdaftar</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  let roleBadgeStyle = {
                    bg: '#dbeafe',
                    text: '#1e40af',
                    icon: 'co_present',
                    label: 'Dosen',
                  };
                  if (u.role === 'admin') {
                    roleBadgeStyle = {
                      bg: '#f3e8ff',
                      text: '#6b21a8',
                      icon: 'admin_panel_settings',
                      label: 'Admin',
                    };
                  } else if (u.role === 'mahasiswa') {
                    roleBadgeStyle = {
                      bg: '#d1fae5',
                      text: '#065f46',
                      icon: 'school',
                      label: 'Mahasiswa',
                    };
                  }

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.colors.surfaceContainerLow)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* User Info */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              backgroundColor: roleBadgeStyle.bg,
                              color: roleBadgeStyle.text,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                              {roleBadgeStyle.icon}
                            </span>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: theme.colors.onSurface }}>
                              {u.nama}
                              {isCurrent && (
                                <span
                                  style={{
                                    marginLeft: '6px',
                                    padding: '2px 6px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    borderRadius: theme.borderRadius.sm,
                                    backgroundColor: theme.colors.primaryFixed,
                                    color: theme.colors.primary,
                                  }}
                                >
                                  Akun Anda
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: theme.colors.onSurfaceVariant }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.75rem',
                            borderRadius: theme.borderRadius.full,
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: roleBadgeStyle.bg,
                            color: roleBadgeStyle.text,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                            {roleBadgeStyle.icon}
                          </span>
                          {roleBadgeStyle.label}
                        </span>
                      </td>

                      {/* Nomor Induk */}
                      <td style={{ padding: '0.9rem 1.25rem', fontFamily: 'monospace', fontWeight: 600 }}>
                        {u.nomor_induk || '-'}
                      </td>

                      {/* Prodi / Jabatan */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ color: theme.colors.onSurface, fontWeight: 500 }}>
                          {u.nama_prodi || u.mahasiswa_prodi || (u.role === 'admin' ? 'Sistem Administrator' : '-')}
                        </div>
                        {u.dosen_jabatan && (
                          <div style={{ fontSize: '12px', color: theme.colors.onSurfaceVariant }}>
                            {u.dosen_jabatan}
                          </div>
                        )}
                      </td>

                      {/* Created At */}
                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '12px', color: theme.colors.onSurfaceVariant }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }) : '-'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(u)}
                          disabled={isCurrent}
                          title={isCurrent ? 'Anda tidak dapat menghapus akun sendiri' : 'Hapus pengguna'}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: isCurrent ? 'not-allowed' : 'pointer',
                            color: isCurrent ? theme.colors.outlineVariant : theme.colors.error,
                            padding: '6px',
                            borderRadius: '50%',
                            opacity: isCurrent ? 0.3 : 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                            delete
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah Pengguna Baru */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 28, 45, 0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !formSubmitting) setIsModalOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              backgroundColor: theme.colors.surfaceContainerLowest,
              borderRadius: theme.borderRadius.xl,
              boxShadow: theme.shadows.cardElevated,
              border: `1px solid ${theme.colors.surfaceContainer}`,
              overflow: 'hidden',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeInUp 0.2s ease-out',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: theme.colors.primaryFixed,
                    color: theme.colors.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    person_add
                  </span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: theme.colors.onSurface }}>
                    Tambah Pengguna Baru
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: theme.colors.onSurfaceVariant }}>
                    Daftarkan akun Mahasiswa, Dosen, atau Admin langsung ke sistem
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !formSubmitting && setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.outline,
                  padding: '4px',
                  borderRadius: '50%',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  close
                </span>
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleCreateUser}
              style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              {formError && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: theme.colors.errorContainer,
                    color: theme.colors.onErrorContainer,
                    borderRadius: theme.borderRadius.default,
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    error
                  </span>
                  <span>{formError}</span>
                </div>
              )}

              {/* Role Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.4rem', color: theme.colors.onSurface }}>
                  Pilih Role Pengguna
                </label>
                <div
                  style={{
                    display: 'flex',
                    backgroundColor: theme.colors.surfaceContainerLow,
                    borderRadius: theme.borderRadius.default,
                    padding: '4px',
                    gap: '4px',
                  }}
                >
                  {[
                    { key: 'mahasiswa', label: 'Mahasiswa', icon: 'school' },
                    { key: 'dosen', label: 'Dosen', icon: 'co_present' },
                    { key: 'admin', label: 'Admin', icon: 'admin_panel_settings' },
                  ].map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setSelectedRole(r.key)}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.5rem',
                        borderRadius: theme.borderRadius.sm,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 700,
                        transition: 'all 0.18s ease',
                        backgroundColor: selectedRole === r.key ? '#ffffff' : 'transparent',
                        color: selectedRole === r.key ? theme.colors.primary : theme.colors.onSurfaceVariant,
                        boxShadow: selectedRole === r.key ? theme.shadows.cardSm : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        {r.icon}
                      </span>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shared: Email & Password */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Email Akun *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="contoh@polinela.ac.id"
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: theme.borderRadius.default,
                      border: `1px solid ${theme.colors.outlineVariant}`,
                      backgroundColor: theme.colors.surfaceContainerLow,
                      fontSize: '13px',
                      color: theme.colors.onSurface,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Password Awal *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    placeholder="Min 6 karakter"
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: theme.borderRadius.default,
                      border: `1px solid ${theme.colors.outlineVariant}`,
                      backgroundColor: theme.colors.surfaceContainerLow,
                      fontSize: '13px',
                      color: theme.colors.onSurface,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Dosen Specific Fields */}
              {selectedRole === 'dosen' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.35rem' }}>
                        NIP Dosen *
                      </label>
                      <input
                        type="text"
                        name="nip"
                        value={formData.nip}
                        onChange={handleFormChange}
                        placeholder="Contoh: 19850101..."
                        required
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: theme.borderRadius.default,
                          border: `1px solid ${theme.colors.outlineVariant}`,
                          backgroundColor: theme.colors.surfaceContainerLow,
                          fontSize: '13px',
                          color: theme.colors.onSurface,
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.35rem' }}>
                        Jabatan
                      </label>
                      <select
                        name="jabatan"
                        value={formData.jabatan}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: theme.borderRadius.default,
                          border: `1px solid ${theme.colors.outlineVariant}`,
                          backgroundColor: theme.colors.surfaceContainerLow,
                          fontSize: '13px',
                          color: theme.colors.onSurface,
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      >
                        <option value="Tenaga Pendidik">Tenaga Pendidik</option>
                        <option value="Asisten Ahli">Asisten Ahli</option>
                        <option value="Lektor">Lektor</option>
                        <option value="Lektor Kepala">Lektor Kepala</option>
                        <option value="Guru Besar">Guru Besar</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.35rem' }}>
                      Nama Lengkap & Gelar *
                    </label>
                    <input
                      type="text"
                      name="nama"
                      value={formData.nama}
                      onChange={handleFormChange}
                      placeholder="Contoh: Dr. Budi Santoso, S.T., M.T."
                      required
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: theme.borderRadius.default,
                        border: `1px solid ${theme.colors.outlineVariant}`,
                        backgroundColor: theme.colors.surfaceContainerLow,
                        fontSize: '13px',
                        color: theme.colors.onSurface,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.35rem' }}>
                      Program Studi Homebase *
                    </label>
                    <select
                      name="prodi_id"
                      value={formData.prodi_id}
                      onChange={handleFormChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: theme.borderRadius.default,
                        border: `1px solid ${theme.colors.outlineVariant}`,
                        backgroundColor: theme.colors.surfaceContainerLow,
                        fontSize: '13px',
                        color: theme.colors.onSurface,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    >
                      {prodiList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama_prodi} ({p.nama_jurusan})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Mahasiswa Specific Fields */}
              {selectedRole === 'mahasiswa' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.35rem' }}>
                        NIM Mahasiswa *
                      </label>
                      <input
                        type="text"
                        name="nim"
                        value={formData.nim}
                        onChange={handleFormChange}
                        placeholder="Contoh: 22753001"
                        required
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: theme.borderRadius.default,
                          border: `1px solid ${theme.colors.outlineVariant}`,
                          backgroundColor: theme.colors.surfaceContainerLow,
                          fontSize: '13px',
                          color: theme.colors.onSurface,
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.35rem' }}>
                        Program Studi
                      </label>
                      <select
                        name="prodi"
                        value={formData.prodi}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: theme.borderRadius.default,
                          border: `1px solid ${theme.colors.outlineVariant}`,
                          backgroundColor: theme.colors.surfaceContainerLow,
                          fontSize: '13px',
                          color: theme.colors.onSurface,
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      >
                        {prodiList.map((p) => (
                          <option key={p.id} value={p.nama_prodi}>
                            {p.nama_prodi}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '0.35rem' }}>
                      Nama Lengkap Mahasiswa *
                    </label>
                    <input
                      type="text"
                      name="nama"
                      value={formData.nama}
                      onChange={handleFormChange}
                      placeholder="Nama lengkap mahasiswa"
                      required
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: theme.borderRadius.default,
                        border: `1px solid ${theme.colors.outlineVariant}`,
                        backgroundColor: theme.colors.surfaceContainerLow,
                        fontSize: '13px',
                        color: theme.colors.onSurface,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                </>
              )}

              {/* Admin Specific Fields */}
              {selectedRole === 'admin' && (
                <div>
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: theme.colors.primaryFixed,
                      borderRadius: theme.borderRadius.default,
                      fontSize: '13px',
                      color: theme.colors.onPrimaryFixed,
                      display: 'flex',
                      gap: '0.5rem',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      shield
                    </span>
                    <span>
                      Akun Administrator memiliki otoritas penuh untuk mengelola master data gedung, jadwal, dosen, dan pengguna sistem.
                    </span>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSubmitting}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: theme.borderRadius.default,
                    border: `1px solid ${theme.colors.outlineVariant}`,
                    backgroundColor: 'transparent',
                    color: theme.colors.onSurfaceVariant,
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    flex: 1.5,
                    padding: '0.75rem',
                    borderRadius: theme.borderRadius.default,
                    border: 'none',
                    background: theme.gradients.primaryCta,
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: formSubmitting ? 'not-allowed' : 'pointer',
                    opacity: formSubmitting ? 0.7 : 1,
                    boxShadow: theme.shadows.btnPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {formSubmitting ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        check
                      </span>
                      <span>Daftarkan User</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 28, 45, 0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: theme.colors.surfaceContainerLowest,
              borderRadius: theme.borderRadius.xl,
              boxShadow: theme.shadows.cardElevated,
              padding: '1.75rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: theme.colors.errorContainer,
                color: theme.colors.error,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                warning
              </span>
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '18px', fontWeight: 800, color: theme.colors.onSurface }}>
              Hapus Pengguna?
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '14px', color: theme.colors.onSurfaceVariant }}>
              Apakah Anda yakin ingin menghapus akun <strong>{deleteTarget.email}</strong> ({deleteTarget.nama})?
              Data profil dan relasi terkait akan ikut dihapus permanen.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: theme.borderRadius.default,
                  border: `1px solid ${theme.colors.outlineVariant}`,
                  backgroundColor: 'transparent',
                  color: theme.colors.onSurfaceVariant,
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: theme.borderRadius.default,
                  border: 'none',
                  backgroundColor: theme.colors.error,
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  opacity: deleteLoading ? 0.7 : 1,
                }}
              >
                {deleteLoading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
