import { showToast } from './utils/toast';
import React from 'react';
import { Link } from 'react-router-dom';
import { WifiOff, RefreshCw } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const OfflinePage = () => {
  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    } else {
      showToast.error('Still offline. Please check your internet connection.', 'Offline');
    }
  };

  return (
    <>
      <title>No Connection | Rentora</title>
      <meta name="robots" content="noindex" />

      <div style={{
        minHeight: '100vh', background: 'var(--bg-color)',
        display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif'
      }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)',
          background: 'var(--header-bg)', backdropFilter: 'blur(12px)'
        }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.3rem', color: 'var(--primary-color)' }}>
              Rentora
            </span>
          </Link>
          <ThemeToggle />
        </header>

        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              background: 'rgba(100, 116, 139, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.75rem'
            }}>
              <WifiOff size={44} color="var(--text-muted)" strokeWidth={1.5} />
            </div>

            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              You're Offline
            </h1>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem' }}>
              It looks like your internet connection is unavailable. Please check your network and try again.
            </p>

            <button
              onClick={handleRetry}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1.75rem', borderRadius: 12,
                background: 'var(--primary-color)', color: '#fff',
                border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} /> Try Again
            </button>
          </div>
        </main>
      </div>
    </>
  );
};

export default OfflinePage;
