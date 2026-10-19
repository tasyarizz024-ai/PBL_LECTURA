import React, { useState } from 'react';
import { apiJson } from '../lib/api';
import theme from '../styles/theme';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Semua kolom password wajib diisi.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok.');
      return;
    }

    if (newPassword === oldPassword) {
      setError('Password baru tidak boleh sama dengan password lama.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiJson('/api/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      setSuccess(res.message || 'Password berhasil diperbarui!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Gagal mengubah password. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setError('');
    setSuccess('');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
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
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderRadius: theme.borderRadius.xl,
          boxShadow: theme.shadows.cardElevated,
          border: `1px solid ${theme.colors.surfaceContainer}`,
          overflow: 'hidden',
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
                lock_reset
              </span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: theme.colors.onSurface }}>
                Ganti Password
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: theme.colors.onSurfaceVariant }}>
                Perbarui kata sandi akun Anda secara mandiri
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: theme.colors.outline,
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: theme.colors.errorContainer,
                color: theme.colors.onErrorContainer,
                borderRadius: theme.borderRadius.default,
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#d1fae5',
                color: '#065f46',
                borderRadius: theme.borderRadius.default,
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                check_circle
              </span>
              <span>{success}</span>
            </div>
          )}

          {/* Password Lama */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: theme.colors.onSurface,
                marginBottom: '0.4rem',
              }}
            >
              Password Lama
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
                required
                style={{
                  width: '100%',
                  padding: '0.7rem 2.5rem 0.7rem 0.9rem',
                  borderRadius: theme.borderRadius.default,
                  border: `1px solid ${theme.colors.outlineVariant}`,
                  backgroundColor: theme.colors.surfaceContainerLow,
                  fontSize: '14px',
                  color: theme.colors.onSurface,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowOld((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.outline,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {showOld ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Password Baru */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: theme.colors.onSurface,
                marginBottom: '0.4rem',
              }}
            >
              Password Baru
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
                style={{
                  width: '100%',
                  padding: '0.7rem 2.5rem 0.7rem 0.9rem',
                  borderRadius: theme.borderRadius.default,
                  border: `1px solid ${theme.colors.outlineVariant}`,
                  backgroundColor: theme.colors.surfaceContainerLow,
                  fontSize: '14px',
                  color: theme.colors.onSurface,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.outline,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {showNew ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Konfirmasi Password Baru */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: theme.colors.onSurface,
                marginBottom: '0.4rem',
              }}
            >
              Konfirmasi Password Baru
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                required
                style={{
                  width: '100%',
                  padding: '0.7rem 2.5rem 0.7rem 0.9rem',
                  borderRadius: theme.borderRadius.default,
                  border: `1px solid ${
                    confirmPassword && confirmPassword !== newPassword
                      ? theme.colors.error
                      : theme.colors.outlineVariant
                  }`,
                  backgroundColor: theme.colors.surfaceContainerLow,
                  fontSize: '14px',
                  color: theme.colors.onSurface,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.outline,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {showConfirm ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <span style={{ fontSize: '12px', color: theme.colors.error, marginTop: '4px', display: 'block' }}>
                Password tidak cocok.
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
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
              disabled={loading}
              style={{
                flex: 1.5,
                padding: '0.75rem',
                borderRadius: theme.borderRadius.default,
                border: 'none',
                background: theme.gradients.primaryCta,
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: theme.shadows.btnPrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    check
                  </span>
                  <span>Simpan Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
