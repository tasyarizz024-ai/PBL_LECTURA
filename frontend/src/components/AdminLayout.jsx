import React, { useState } from 'react';
import theme from '../styles/theme';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'manajemen-dosen', label: 'Manajemen Dosen', icon: 'manage_accounts' },
  { key: 'manajemen-gedung', label: 'Manajemen Gedung', icon: 'location_city' },
  { key: 'manajemen-jadwal', label: 'Manajemen Jadwal', icon: 'event_note' },
  { key: 'jurusan-prodi', label: 'Jurusan & Prodi', icon: 'account_tree' },
  { key: 'log-aktivitas', label: 'Log Aktivitas', icon: 'history' },
];

export default function AdminLayout({ activePage, onNavigate, user, onLogout, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.surface }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarCollapsed ? '72px' : '240px',
          minHeight: '100vh',
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderRight: `1px solid ${theme.colors.surfaceContainer}`,
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s ease',
          overflow: 'hidden',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: sidebarCollapsed ? '1.2rem 0' : '1.25rem 1.25rem',
            borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: theme.borderRadius.default,
              background: theme.gradients.primaryCta,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: theme.shadows.btnPrimary,
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>school</span>
          </div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.02em', color: theme.colors.primary }}>
                LECTURA
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.onSurfaceVariant, letterSpacing: '0.02em' }}>
                ADMIN PANEL
              </div>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                title={sidebarCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: sidebarCollapsed ? '0.75rem' : '0.75rem 1rem',
                  borderRadius: theme.borderRadius.default,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: theme.typography.fontFamily.base,
                  fontSize: '16px',
                  fontWeight: isActive ? 700 : 500,
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  backgroundColor: isActive ? theme.colors.primaryFixed : 'transparent',
                  color: isActive ? theme.colors.primary : theme.colors.onSurfaceVariant,
                  transition: 'all 0.18s ease',
                  width: '100%',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', flexShrink: 0 }}>
                  {item.icon}
                </span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div style={{ padding: '0.5rem', borderTop: `1px solid ${theme.colors.surfaceContainer}` }}>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            title={sidebarCollapsed ? 'Perluas sidebar' : 'Lipat sidebar'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '0.65rem',
              borderRadius: theme.borderRadius.default,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              color: theme.colors.onSurfaceVariant,
              transition: 'background 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        {/* User Section */}
        <div
          style={{
            padding: sidebarCollapsed ? '0.75rem 0.5rem' : '0.85rem 1rem',
            borderTop: `1px solid ${theme.colors.surfaceContainer}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: theme.colors.primary,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>admin_panel_settings</span>
          </div>
          {!sidebarCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.onSurface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.nama || 'Administrator'}
              </div>
              <div style={{ fontSize: '12px', color: theme.colors.onSurfaceVariant }}>Admin</div>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={onLogout}
              title="Keluar"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: theme.colors.outline,
                display: 'flex',
                alignItems: 'center',
                padding: '0.25rem',
                borderRadius: theme.borderRadius.sm,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            backgroundColor: theme.colors.surfaceContainerLowest,
            borderBottom: `1px solid ${theme.colors.surfaceContainer}`,
            padding: '0.85rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: theme.colors.onSurface, margin: 0 }}>
              {navItems.find((n) => n.key === activePage)?.label || 'Admin Panel'}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.85rem',
                backgroundColor: theme.colors.errorContainer,
                borderRadius: theme.borderRadius.full,
                cursor: 'pointer',
              }}
              onClick={onLogout}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: theme.colors.error }}>logout</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.error }}>Keluar</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
