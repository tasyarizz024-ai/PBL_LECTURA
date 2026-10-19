import React, { useState } from 'react';
import theme from '../styles/theme';
import ChangePasswordModal from './ChangePasswordModal';

export default function Navbar({ activeTab = 'cari-dosen', onNavigate, user, onLogout }) {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  return (
    <header
      style={{
        backgroundColor: theme.colors.surfaceContainerLowest,
        borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: theme.borderRadius.default,
              background: theme.gradients.primaryCta,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: theme.shadows.btnPrimary,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
              school
            </span>
          </div>
          <div>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: theme.colors.primary,
              }}
            >
              LECTURA
            </span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: theme.colors.onSurfaceVariant,
                display: 'block',
                lineHeight: 1,
                letterSpacing: '0.02em',
              }}
            >
              PRESENSI DOSEN
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('cari-dosen')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: theme.typography.fontSize.bodyMd.size,
              fontWeight: 600,
              color: activeTab === 'cari-dosen' ? theme.colors.primary : theme.colors.onSurfaceVariant,
              borderBottom: activeTab === 'cari-dosen' ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
              paddingBottom: '4px',
            }}
          >
            Beranda / Cari Dosen
          </button>
        </nav>

        {/* User Chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              backgroundColor: theme.colors.surfaceContainerLow,
              borderRadius: theme.borderRadius.full,
              border: `1px solid ${theme.colors.surfaceContainer}`,
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: theme.colors.primary,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                person
              </span>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurface }}>
                {user?.nama || 'Mahasiswa'}
              </div>
              <div style={{ fontSize: '12px', color: theme.colors.onSurfaceVariant }}>
                {user?.nim || 'Portal Mahasiswa'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsChangePasswordOpen(true)}
            title="Ganti Password"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.85rem',
              backgroundColor: theme.colors.surfaceContainerLow,
              borderRadius: theme.borderRadius.full,
              border: `1px solid ${theme.colors.surfaceContainer}`,
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              color: theme.colors.primary,
              fontFamily: theme.typography.fontFamily.base,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>lock_reset</span>
            Password
          </button>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Keluar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.85rem',
                backgroundColor: theme.colors.errorContainer,
                borderRadius: theme.borderRadius.full,
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                color: theme.colors.error,
                fontFamily: theme.typography.fontFamily.base,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>logout</span>
              Keluar
            </button>
          )}
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </header>
  );
}

