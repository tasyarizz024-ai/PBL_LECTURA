import React, { useState } from 'react';
import { apiJson } from '../lib/api';
import theme from '../styles/theme';

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.7rem 0.85rem',
  border: `1px solid ${theme.colors.outlineVariant}`,
  borderRadius: theme.borderRadius.default,
  backgroundColor: theme.colors.surfaceContainerLowest,
  color: theme.colors.onSurface,
  fontSize: '15px',
  fontFamily: theme.typography.fontFamily.base,
};

export default function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak sama.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Password baru harus berbeda dari password saat ini.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password baru harus terdiri dari minimal 8 karakter.');
      return;
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
      setError('Password baru tidak boleh melebihi 72 byte.');
      return;
    }

    setSaving(true);
    try {
      const result = await apiJson('/api/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setSuccess(result.message || 'Password berhasil diubah.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Gagal mengubah password.');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: 'Password saat ini', value: currentPassword, set: setCurrentPassword, autoComplete: 'current-password' },
    { label: 'Password baru', value: newPassword, set: setNewPassword, autoComplete: 'new-password' },
    { label: 'Konfirmasi password baru', value: confirmPassword, set: setConfirmPassword, autoComplete: 'new-password' },
  ];

  return (
    <div
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(17, 28, 45, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
          padding: '1.5rem',
          backgroundColor: theme.colors.surfaceContainerLowest,
          border: `1px solid ${theme.colors.surfaceContainer}`,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadows.card,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="change-password-title" style={{ margin: 0, fontSize: '19px', color: theme.colors.onSurface }}>
            Ubah Password
          </h2>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            disabled={saving}
            style={{ border: 'none', background: 'transparent', color: theme.colors.outline, cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p style={{ margin: 0, color: theme.colors.onSurfaceVariant, fontSize: '14px' }}>
          Password baru minimal 8 karakter.
        </p>

        {error && (
          <div role="alert" style={{
            padding: '0.7rem 0.85rem',
            borderRadius: theme.borderRadius.default,
            backgroundColor: theme.colors.errorContainer,
            color: theme.colors.onErrorContainer,
            fontSize: '14px',
          }}>{error}</div>
        )}
        {success && (
          <div role="status" style={{
            padding: '0.7rem 0.85rem',
            borderRadius: theme.borderRadius.default,
            backgroundColor: '#d1fae5',
            color: '#065f46',
            fontSize: '14px',
          }}>{success}</div>
        )}

        {fields.map((field, index) => (
          <label key={field.label} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            fontSize: '14px',
            fontWeight: 700,
            color: theme.colors.onSurfaceVariant,
          }}>
            {field.label}
            <input
              required
              type="password"
              minLength={index > 0 ? 8 : undefined}
              autoComplete={field.autoComplete}
              value={field.value}
              onChange={(event) => field.set(event.target.value)}
              style={inputStyle}
            />
          </label>
        ))}

        <button type="submit" disabled={saving} style={{
          padding: '0.75rem 1rem',
          border: 'none',
          borderRadius: theme.borderRadius.full,
          background: theme.gradients.primaryCta,
          color: '#fff',
          fontSize: '15px',
          fontWeight: 700,
          fontFamily: theme.typography.fontFamily.base,
          cursor: saving ? 'wait' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Menyimpan...' : 'Simpan Password Baru'}
        </button>
      </form>
    </div>
  );
}
