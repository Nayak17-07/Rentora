import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Package } from 'lucide-react';

const ThankYouPage = () => {
  const location = useLocation();
  const state = location.state || {};
  const orderRef = state.orderId || state.transactionId || null;
  const heading = state.title || 'Thank You for Choosing Rentora!';
  const message =
    state.message ||
    'Your request has been received. You can track your rentals, escrow deposit, and delivery status anytime from My Rentals.';

  return (
    <>
      <title>Thank You | Rentora</title>
      <meta name="description" content="Confirmation page for your Rentora order or inquiry." />
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: 'var(--bg-color, #f8fafc)',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: '100%',
            background: 'var(--surface-color, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: 20,
            padding: '2.5rem 2rem',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem'
            }}
          >
            <CheckCircle2 size={36} color="#10b981" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', marginBottom: '0.6rem' }}>
            {heading}
          </h1>
          <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '0.95rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
            {message}
          </p>
          {orderRef && (
            <div
              style={{
                background: 'var(--surface-muted, #f1f5f9)',
                borderRadius: 10,
                padding: '0.65rem 1rem',
                fontSize: '0.86rem',
                color: 'var(--text-primary, #0f172a)',
                marginBottom: '1.5rem'
              }}
            >
              Reference ID: <strong>{orderRef}</strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/my-rentals"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.75rem 1.35rem',
                borderRadius: 12,
                background: 'var(--primary-color, #e23744)',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}
            >
              <Package size={17} /> View My Rentals
            </Link>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.75rem 1.35rem',
                borderRadius: 12,
                border: '1px solid var(--border-color, #cbd5e1)',
                color: 'var(--text-primary, #0f172a)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              Browse Catalog <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default ThankYouPage;
