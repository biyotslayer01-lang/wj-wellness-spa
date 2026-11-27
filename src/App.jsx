import React, { useCallback, useEffect, useState } from 'react';
import { Flower2, ShieldCheck, LogOut, AlertCircle } from 'lucide-react';
import { api, initializeSecurity } from './api';
import { Toast, Modal, getPageFromHash } from './components/Common';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';

import { DashboardPage } from './pages/DashboardPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { CustomersPage } from './pages/CustomersPage';
import { TherapistsPage } from './pages/TherapistsPage';
import { ServicesPage } from './pages/ServicesPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { LoginPage } from './pages/LoginPage';
import { BookingPage } from './pages/BookingPage';
import { ChangePasswordModal } from './pages/ChangePasswordModal';

function PageRenderer({ page, user, refreshKey, onChanged, notify, setPage }) {
  const props = { user, refreshKey, onChanged, notify, setPage };
  switch (page) {
    case 'appointments': return <AppointmentsPage {...props} />;
    case 'customers': return <CustomersPage {...props} />;
    case 'therapists': return <TherapistsPage {...props} />;
    case 'services': return <ServicesPage {...props} />;
    case 'transactions': return <TransactionsPage {...props} />;
    case 'reports': return <ReportsPage {...props} />;
    case 'users': return <UsersPage {...props} />;
    default: return <DashboardPage {...props} />;
  }
}

function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [page, setPageState] = useState(getPageFromHash);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSignoutModal, setShowSignoutModal] = useState(false);

  const navigate = useCallback((next) => {
    window.location.hash = next;
    setPageState(next);
    setMobileNav(false);
  }, []);

  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => {
      setHash(window.location.hash);
      setPageState(getPageFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(null), 3600);
  }, []);
  const changed = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await initializeSecurity();
        const result = await api('/api/auth/me');
        if (active) setUser(result.user);
      } catch (_error) {
        if (active) setUser(null);
      } finally {
        if (active) setBooting(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const login = async (email, password) => {
    const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setUser(result.user);
    navigate('dashboard');
    notify(`Welcome back, ${result.user.full_name.split(' ')[0]}.`);
  };

  const logout = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (_error) { /* clear local session */ }
    setUser(null);
    setShowSignoutModal(false);
    navigate('dashboard');
    notify('You have been signed out.');
  };

  const handleRequestSignout = () => {
    setShowSignoutModal(true);
  };

  if (booting) {
    return (
      <div className="boot-screen">
        <div className="brand-mark"><Flower2 size={27} /></div>
        <div className="loading-orbit" />
        <p>Preparing your workspace...</p>
      </div>
    );
  }

  const isBookingPath = window.location.pathname === '/book' || hash === '#book' || hash === '#/book';
  if (isBookingPath) return <BookingPage notify={notify} />;
  if (!user) return <LoginPage onLogin={login} notify={notify} />;

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        page={page}
        setPage={navigate}
        logout={handleRequestSignout}
        mobileNav={mobileNav}
        setMobileNav={setMobileNav}
        onChangePassword={() => setShowPasswordModal(true)}
      />
      <main className="main-area">
        <Topbar user={user} page={page} setMobileNav={setMobileNav} logout={handleRequestSignout} />
        <div className="page-content">
          <PageRenderer page={page} user={user} refreshKey={refreshKey} onChanged={changed} notify={notify} setPage={navigate} />
        </div>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} WJ Wellness Spa</span>
          <span><ShieldCheck size={13} /> Secure management workspace</span>
        </footer>
      </main>
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} notify={notify} />}
      
      {/* SIGN OUT CONFIRMATION MODAL */}
      {showSignoutModal && (
        <Modal
          title="Sign out confirmation"
          subtitle="Are you sure you want to log out of your workspace?"
          onClose={() => setShowSignoutModal(false)}
        >
          <div style={{ padding: '8px 0 6px' }}>
            <p style={{ color: '#5a4247', fontSize: '0.98rem', lineHeight: 1.5, margin: '0 0 20px' }}>
              You will be signed out from your current staff session and returned to the WJ Wellness Spa sign-in screen.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowSignoutModal(false)}
                style={{ padding: '10px 18px' }}
              >
                Stay signed in
              </button>
              <button
                type="button"
                onClick={logout}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #a4283b 0%, #7b1826 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(123, 24, 38, 0.35)'
                }}
              >
                <LogOut size={16} /> Yes, Sign out
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;
