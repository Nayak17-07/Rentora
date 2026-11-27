import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';

const CONSENT_KEY = 'rentora_cookie_consent';

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      if (!saved) setVisible(true);
    } catch {
      setVisible(false);
    }
  }, []);

  const handleChoice = (choice) => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({
        status: choice,
        updated_at: new Date().toISOString()
      }));
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(92vw, 680px)',
        background: 'var(--surface-color, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: 16,
        padding: '1rem 1.25rem',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.16)',
        zIndex: 9999,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.85rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 320px' }}>
        <Cookie size={22} color="var(--primary-color, #e23744)" style={{ flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.5 }}>
          We use essential cookies for login/cart and optional analytics cookies to improve recommendations.{' '}
          <Link to="/cookies" style={{ color: 'var(--primary-color, #e23744)', textDecoration: 'underline' }}>
            Cookie Policy
          </Link>
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => handleChoice('essential_only')}
          style={{
            padding: '0.5rem 0.9rem',
            borderRadius: 10,
            border: '1px solid var(--border-color, #cbd5e1)',
            background: 'transparent',
            color: 'var(--text-primary, #0f172a)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Essential Only
        </button>
        <button
          type="button"
          onClick={() => handleChoice('accepted')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 10,
            border: 'none',
            background: 'var(--primary-color, #e23744)',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Accept All
        </button>
      </div>
    </div>
  );
};

export default CookieBanner;
