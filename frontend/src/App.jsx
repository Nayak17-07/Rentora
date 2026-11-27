import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

// ── Lazy-loaded Core pages (On-Demand Code Splitting) ─────────────────────────
const HomePage         = lazy(() => import('./HomePage'));
const CartPage         = lazy(() => import('./CartPage'));
const MyRentalsPage    = lazy(() => import('./MyRentalsPage'));
const KYCPage          = lazy(() => import('./KYCPage'));
const AdminDashboard   = lazy(() => import('./AdminDashboard'));
const AdminLoginPage   = lazy(() => import('./AdminLoginPage'));
const OwnerDashboard   = lazy(() => import('./OwnerDashboard'));
const LoginPage        = lazy(() => import('./LoginPage'));
const RegisterPage     = lazy(() => import('./RegisterPage'));

// ── Error / system pages ─────────────────────────────────────────────────────
import ErrorBoundary      from './ErrorBoundary';
import NotFoundPage       from './NotFoundPage';
import ForbiddenPage      from './ForbiddenPage';
import SessionExpiredPage from './SessionExpiredPage';
import OfflinePage        from './OfflinePage';
import { ToastContainer } from './utils/toast';

// ── Lazy-loaded Legal & Info pages ───────────────────────────────────────────
const TermsPage        = lazy(() => import('./LegalPages').then(m => ({ default: m.TermsPage })));
const PrivacyPage      = lazy(() => import('./LegalPages').then(m => ({ default: m.PrivacyPage })));
const CookiesPage      = lazy(() => import('./LegalPages').then(m => ({ default: m.CookiesPage })));
const RefundPolicyPage = lazy(() => import('./LegalPages').then(m => ({ default: m.RefundPolicyPage })));
const FAQPage          = lazy(() => import('./LegalPages').then(m => ({ default: m.FAQPage })));
const ContactPage      = lazy(() => import('./LegalPages').then(m => ({ default: m.ContactPage })));

// ── Route guards ─────────────────────────────────────────────────────────────
import {
  ProtectedRoute,
  RoleRoute,
  GuestRoute
} from './RouteGuards';

// Sleek fallback loader during async route chunk transitions
const PageLoader = () => (
  <div style={{
    minHeight: '75vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.85rem'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid #fee2e2',
      borderTopColor: '#e23744',
      borderRadius: '50%',
      animation: 'spin 0.75s linear infinite'
    }} />
    <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>Loading Rentora...</span>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════
   App Component
   ══════════════════════════════════════════════════════════════════════════ */
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem('access_token')
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // ── Auth helpers ──────────────────────────────────────────────────────────
  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    setIsAuthenticated(false);
  }, []);

  // ── Keep auth state in sync across tabs ───────────────────────────────────
  useEffect(() => {
    const onStorage = () => {
      setIsAuthenticated(!!localStorage.getItem('access_token'));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ── Online / offline detection ────────────────────────────────────────────
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Show offline page when network is gone
  if (!isOnline) {
    return <OfflinePage />;
  }

  return (
    <Router>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Auth (guest-only) ─────────────────────────────────────────── */}
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage onLogin={handleLogin} />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <RegisterPage onLogin={handleLogin} />
                </GuestRoute>
              }
            />

            {/* ── Admin login (public – has its own auth logic) ─────────────── */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* ── System / error pages ─────────────────────────────────────── */}
            <Route path="/404"             element={<NotFoundPage />} />
            <Route path="/403"             element={<ForbiddenPage />} />
            <Route path="/session-expired" element={<SessionExpiredPage />} />
            <Route path="/offline"         element={<OfflinePage />} />

            {/* ── Legal & informational pages (public) ─────────────────────── */}
            <Route path="/terms"           element={<TermsPage />} />
            <Route path="/privacy"         element={<PrivacyPage />} />
            <Route path="/cookies"         element={<CookiesPage />} />
            <Route path="/refund-policy"   element={<RefundPolicyPage />} />
            <Route path="/faq"             element={<FAQPage />} />
            <Route path="/contact"         element={<ContactPage />} />

            {/* ── Protected customer routes ─────────────────────────────────── */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <CartPage onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rentals"
              element={
                <ProtectedRoute>
                  <MyRentalsPage onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kyc"
              element={
                <ProtectedRoute>
                  <KYCPage />
                </ProtectedRoute>
              }
            />

            {/* ── Owner dashboard (role-gated) ──────────────────────────────── */}
            <Route
              path="/owner"
              element={
                <RoleRoute role="owner">
                  <OwnerDashboard onLogout={handleLogout} />
                </RoleRoute>
              }
            />

            {/* ── Admin dashboard (role-gated) ──────────────────────────────── */}
            <Route
              path="/admin"
              element={
                <RoleRoute role="admin">
                  <AdminDashboard onLogout={handleLogout} />
                </RoleRoute>
              }
            />

            {/* ── 404 catch-all ────────────────────────────────────────────── */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>

        <ToastContainer />
      </ErrorBoundary>
    </Router>
  );
}

export default App;
