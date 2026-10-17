import React, { useState } from 'react';
import { apiJson, setSession } from '../lib/api';
import theme from '../styles/theme';

export default function LoginPage({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('mahasiswa'); // 'mahasiswa' | 'admin'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Info untuk link "Lupa password?" (fitur reset password di luar scope PRD).
  const [info, setInfo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) {
      setError('Email/NIM dan password wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      const body = {
        password,
        role: activeTab,
      };
      // Email or NIM
      if (identifier.includes('@')) {
        body.email = identifier.trim();
      } else {
        body.nim = identifier.trim();
      }

      const result = await apiJson('/api/auth/login', {
        method: 'POST',
        // auth:false → 401 dari endpoint ini tidak memicu auto-logout global.
        auth: false,
        body: JSON.stringify(body),
      });

      setSession(result.token, result.user);
      onLoginSuccess(result.user);
    } catch (err) {
      setError(
        err.status === 401
          ? err.message
          : err.message || 'Tidak dapat terhubung ke server. Coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  const placeholderText =
    activeTab === 'mahasiswa' ? 'NIM atau Email Kampus' : 'Email Admin';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient blobs */}
      <div
        className="animate-float-slow"
        style={{
          position: 'fixed',
          top: '-6rem',
          left: '-5rem',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          backgroundColor: 'rgba(225, 224, 255, 0.6)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        className="animate-float-reverse"
        style={{
          position: 'fixed',
          bottom: '-6rem',
          right: '-5rem',
          width: '460px',
          height: '460px',
          borderRadius: '50%',
          backgroundColor: 'rgba(233, 221, 255, 0.5)',
          filter: 'blur(110px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Login Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '440px',
          margin: '0 1rem',
          backgroundColor: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: theme.borderRadius.xl,
          border: '1px solid rgba(255,255,255,0.65)',
          boxShadow: '0 32px 64px -12px rgba(70, 72, 212, 0.18), 0 16px 32px -8px rgba(107, 56, 212, 0.1)',
          padding: '2.5rem 2.25rem',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: theme.borderRadius.default,
              background: theme.gradients.primaryCta,
              color: '#fff',
              boxShadow: theme.shadows.btnPrimary,
              marginBottom: '1rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
              school
            </span>
          </div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: theme.colors.onSurface,
              margin: '0 0 0.25rem 0',
            }}
          >
            LECTURA
          </h1>
          <p style={{ fontSize: '16px', color: theme.colors.onSurfaceVariant, margin: 0 }}>
            Sistem Presensi & Pelacakan Dosen
          </p>
        </div>

        {/* Role Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: theme.colors.surfaceContainerLow,
            borderRadius: theme.borderRadius.full,
            padding: '4px',
            marginBottom: '1.75rem',
          }}
        >
          {['mahasiswa', 'admin'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setError('');
                setIdentifier('');
                setPassword('');
              }}
              style={{
                flex: 1,
                padding: '0.55rem 1rem',
                borderRadius: theme.borderRadius.full,
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: theme.typography.fontFamily.base,
                transition: 'all 0.22s ease',
                backgroundColor: activeTab === tab ? '#ffffff' : 'transparent',
                color: activeTab === tab ? theme.colors.primary : theme.colors.onSurfaceVariant,
                boxShadow: activeTab === tab ? theme.shadows.cardSm : 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '5px' }}>
                {tab === 'mahasiswa' ? 'person' : 'admin_panel_settings'}
              </span>
              {tab === 'mahasiswa' ? 'Mahasiswa' : 'Admin / Staff'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Identifier field */}
          <div>
            <label
              htmlFor="login-identifier"
              style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurfaceVariant, display: 'block', marginBottom: '0.4rem' }}
            >
              {activeTab === 'mahasiswa' ? 'NIM atau Email Kampus' : 'Email Admin'}
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: theme.colors.surfaceContainerLowest,
                border: `1.5px solid ${error ? theme.colors.error : theme.colors.surfaceContainerHighest}`,
                borderRadius: theme.borderRadius.lg,
                padding: '0 1rem',
                transition: 'border-color 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: theme.colors.outline, marginRight: '0.6rem' }}>
                {activeTab === 'mahasiswa' ? 'badge' : 'alternate_email'}
              </span>
              <input
                id="login-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={placeholderText}
                autoComplete="username"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '16px',
                  padding: '0.85rem 0',
                  backgroundColor: 'transparent',
                  color: theme.colors.onSurface,
                  fontFamily: theme.typography.fontFamily.base,
                }}
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label
                htmlFor="login-password"
                style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurfaceVariant }}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setInfo('Fitur reset password belum tersedia. Silakan hubungi admin kampus untuk mengatur ulang password akun Anda.')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: theme.colors.primary,
                  fontWeight: 600,
                  fontFamily: theme.typography.fontFamily.base,
                }}
              >
                Lupa password?
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: theme.colors.surfaceContainerLowest,
                border: `1.5px solid ${error ? theme.colors.error : theme.colors.surfaceContainerHighest}`,
                borderRadius: theme.borderRadius.lg,
                padding: '0 1rem',
                transition: 'border-color 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: theme.colors.outline, marginRight: '0.6rem' }}>
                lock
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '16px',
                  padding: '0.85rem 0',
                  backgroundColor: 'transparent',
                  color: theme.colors.onSurface,
                  fontFamily: theme.typography.fontFamily.base,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: '0', color: theme.colors.outline }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              style={{
                backgroundColor: theme.colors.errorContainer,
                color: theme.colors.onErrorContainer,
                borderRadius: theme.borderRadius.default,
                padding: '0.75rem 1rem',
                fontSize: '16px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
              {error}
            </div>
          )}

          {/* Info banner (reset password belum tersedia) */}
          {info && (
            <div
              role="status"
              style={{
                backgroundColor: theme.colors.primaryFixed,
                color: theme.colors.primary,
                borderRadius: theme.borderRadius.default,
                padding: '0.75rem 1rem',
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
              <span style={{ flex: 1 }}>{info}</span>
              <button
                type="button"
                onClick={() => setInfo('')}
                aria-label="Tutup informasi"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: 'inherit', padding: 0 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            id="btn-login"
            type="submit"
            disabled={loading}
            style={{
              background: loading ? theme.colors.surfaceContainerHigh : theme.gradients.primaryCta,
              color: loading ? theme.colors.onSurfaceVariant : '#ffffff',
              border: 'none',
              borderRadius: theme.borderRadius.lg,
              padding: '0.9rem 1.5rem',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: theme.typography.fontFamily.base,
              boxShadow: loading ? 'none' : theme.shadows.btnPrimary,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.25rem',
            }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>
                  progress_activity
                </span>
                Memverifikasi...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {activeTab === 'mahasiswa' ? 'login' : 'admin_panel_settings'}
                </span>
                Masuk sebagai {activeTab === 'mahasiswa' ? 'Mahasiswa' : 'Admin'}
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '16px',
            color: theme.colors.outlineVariant,
            lineHeight: 1.6,
          }}
        >
          LECTURA © 2026 — Sistem Tracking Presensi Dosen
        </p>
      </div>
    </div>
  );
}
