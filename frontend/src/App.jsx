import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import MahasiswaDashboard from './pages/MahasiswaDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ManajemenDosen from './pages/ManajemenDosen';
import ManajemenGedung from './pages/ManajemenGedung';
import LogAktivitas from './pages/LogAktivitas';
import JurusanProdi from './pages/JurusanProdi';
import ManajemenJadwal from './pages/ManajemenJadwal';
import ManajemenUser from './pages/ManajemenUser';
import DosenDashboard from './pages/DosenDashboard';
import { clearSession, getStoredUser, SESSION_EXPIRED_EVENT } from './lib/api';

import Navbar from './components/Navbar';
import AdminLayout from './components/AdminLayout';
import theme from './styles/theme';

function App() {
  // Session state diinisialisasi langsung dari storage (lazy initializer),
  // bukan lewat efek, supaya tidak ada render pertama dengan user=null
  // yang berkedip ke halaman login.
  const [user, setUser] = useState(() => getStoredUser());

  // Mahasiswa nav tab
  const [activeTab, setActiveTab] = useState('cari-dosen');
  // Admin nav page
  const [adminPage, setAdminPage] = useState('dashboard');

  // Banner untuk pengumuman session expired dari interceptor 401.
  const [sessionNotice, setSessionNotice] = useState(null);

  const handleLoginSuccess = (userData) => {
    setSessionNotice(null);
    setUser(userData);
    // Reset page state
    setActiveTab('cari-dosen');
    setAdminPage('dashboard');
  };

  const handleLogout = () => {
    clearSession();
    setSessionNotice(null);
    setUser(null);
  };

  // Interceptor global: setiap apiFetch yang kena 401 memancarkan event ini,
  // sehingga user langsung dikembalikan ke halaman login dengan pesan.
  useEffect(() => {
    const onExpired = (e) => {
      setUser(null);
      setSessionNotice(e.detail || 'Sesi berakhir, silakan login kembali.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // Not logged in → Login page (dengan banner bila sesi baru saja berakhir)
  if (!user) {
    return (
      <>
        {sessionNotice && (
          <div
            role="alert"
            style={{
              position: 'fixed',
              top: '1.25rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 400,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.75rem 1.25rem',
              borderRadius: theme.borderRadius.full,
              backgroundColor: theme.colors.errorContainer,
              color: theme.colors.onErrorContainer,
              boxShadow: theme.shadows.card,
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock_clock</span>
            {sessionNotice}
          </div>
        )}
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  if (user.role === 'admin') {
    const renderAdminPage = () => {
      switch (adminPage) {
        case 'dashboard':       return <AdminDashboard />;
        case 'manajemen-user':  return <ManajemenUser />;
        case 'manajemen-dosen': return <ManajemenDosen />;
        case 'manajemen-gedung':return <ManajemenGedung />;
        case 'manajemen-jadwal': return <ManajemenJadwal />;
        case 'jurusan-prodi':    return <JurusanProdi />;
        case 'log-aktivitas':   return <LogAktivitas />;
        default:                return <AdminDashboard />;
      }
    };

    return (
      <AdminLayout
        activePage={adminPage}
        onNavigate={setAdminPage}
        user={user}
        onLogout={handleLogout}
      >
        {renderAdminPage()}
      </AdminLayout>
    );
  }

  // ── Dosen ──────────────────────────────────────────────────────────────────
  if (user.role === 'dosen') {
    return <DosenDashboard onLogout={handleLogout} />;
  }

  // ── Mahasiswa ──────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.surface, position: 'relative' }}>
      {/* Ambient background glows */}
      <div
        className="animate-float-slow"
        style={{
          position: 'fixed',
          top: '-6rem',
          left: '-5rem',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          backgroundColor: 'rgba(225, 224, 255, 0.55)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        className="animate-float-reverse"
        style={{
          position: 'fixed',
          top: '25%',
          right: '-7rem',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          backgroundColor: 'rgba(233, 221, 255, 0.45)',
          filter: 'blur(110px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 10 }}>
        <Navbar
          activeTab={activeTab}
          onNavigate={setActiveTab}
          user={user}
          onLogout={handleLogout}
        />
        <main>
          {activeTab === 'cari-dosen' && <MahasiswaDashboard />}
        </main>
      </div>
    </div>
  );
}

export default App;
