import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  Home as HomeIcon,
  KeyRound,
  Sparkles
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { publicFetch } from './utils/api';

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please provide your admin username/email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await publicFetch('/api/auth/admin-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: identifier.trim(),
          password: password.trim()
        })
      });

      const data = await res.json();

      if (res.ok && data.access) {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('user_role', 'admin');
        if (data.user?.username) {
          localStorage.setItem('username', data.user.username);
        }
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect to isolated Admin Operations Console
        navigate('/admin');
      } else {
        if (res.status === 429) {
          setError(data.error || 'Security Alert: Maximum login attempts exceeded. Access locked for 15 minutes.');
        } else {
          setError(data.error || data.detail || 'Authorization failed. Verify your staff credentials.');
        }
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError('Unable to reach authentication gateway. Verify server status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)', position: 'relative' }}>
      {/* Top action rail */}
      <div style={{ 
        position: 'absolute', 
        top: '1.25rem', 
        right: '1.5rem', 
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            padding: '0.45rem 0.85rem',
            borderRadius: '0.5rem',
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            transition: 'all 0.15s ease'
          }}
        >
          <ArrowLeft size={15} />
          <span>Storefront</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Left side - Branded Executive Visual */}
      <div 
        style={{ 
          flex: '1', 
          display: 'none', 
          position: 'relative' 
        }} 
        className="auth-image-container"
      >
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200" 
          alt="Rentora Executive Headquarters" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'linear-gradient(to right, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.45) 60%, transparent 100%)' 
        }}></div>
        <div style={{ position: 'absolute', bottom: '4rem', left: '4rem', color: '#ffffff', maxWidth: '480px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(226, 55, 68, 0.25)',
            border: '1px solid rgba(226, 55, 68, 0.5)',
            color: '#ff8a93',
            padding: '0.25rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '1rem'
          }}>
            <ShieldCheck size={14} />
            Internal Staff Portal
          </div>
          <h2 style={{ fontSize: '2.4rem', lineHeight: 1.2, marginBottom: '1rem', color: '#ffffff', fontWeight: 800 }}>
            Operations & AI Intelligence Command Center
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#cbd5e1', lineHeight: 1.6 }}>
            Real-time subscriber churn radar, serialized refurbishment tracking, and executive BI metrics for the Rentora marketplace.
          </p>
        </div>
      </div>

      {/* Right side - Unified Form */}
      <div style={{ 
        flex: '1', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '2.5rem 1.5rem', 
        background: 'var(--surface-color, white)' 
      }}>
        <div className="animate-fade-in" style={{ width: '100%', maxWidth: '420px' }}>
          
          {/* Brand Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2.5rem', justifyContent: 'center' }}>
            <div style={{ 
              background: 'var(--primary-color)', 
              padding: '0.5rem', 
              borderRadius: '0.6rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(226, 55, 68, 0.3)'
            }}>
              <ShieldCheck size={22} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-color, #0f172a)', letterSpacing: '-0.02em' }}>
                  Rentora
                </span>
                <span style={{ 
                  background: 'rgba(226, 55, 68, 0.12)', 
                  color: 'var(--primary-color)', 
                  fontSize: '0.72rem', 
                  fontWeight: 800, 
                  padding: '0.15rem 0.5rem', 
                  borderRadius: '0.35rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Admin
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.45rem', color: 'var(--text-color, #0f172a)' }}>
              Staff Command Center
            </h1>
            <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.925rem', lineHeight: 1.5, margin: 0 }}>
              Authenticate with administrative credentials to access operational telemetry and dispatch controls.
            </p>
          </div>

          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              borderLeft: '4px solid var(--primary-color)', 
              padding: '0.85rem 1rem', 
              borderRadius: '0.5rem', 
              marginBottom: '1.5rem', 
              color: '#dc2626', 
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="input-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-color)' }}>
                Staff Username or Email
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', width: '1.15rem', height: '1.15rem' }} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Enter staff identifier" 
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                  style={{ 
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.75rem',
                    borderRadius: '0.6rem',
                    border: '1.5px solid var(--border-color, #cbd5e1)',
                    background: 'var(--card-bg, #ffffff)',
                    color: 'var(--text-color, #0f172a)',
                    fontSize: '0.925rem',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                  required 
                />
              </div>
            </div>

            <div>
              <label className="input-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-color)' }}>
                Master Access Passcode
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', width: '1.15rem', height: '1.15rem' }} />
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Enter your security passcode" 
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  style={{ 
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.75rem',
                    borderRadius: '0.6rem',
                    border: '1.5px solid var(--border-color, #cbd5e1)',
                    background: 'var(--card-bg, #ffffff)',
                    color: 'var(--text-color, #0f172a)',
                    fontSize: '0.925rem',
                    boxSizing: 'border-box'
                  }}
                  required 
                />
              </div>
            </div>

            {/* Quick Demo Credentials Autofill Pill */}
            <div style={{
              background: 'var(--subnav-bg, #f8fafc)',
              border: '1px dashed var(--border-color, #cbd5e1)',
              borderRadius: '0.6rem',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)'
            }}>
              <span>
                🔑 Demo Access: <strong style={{ color: 'var(--text-color)' }}>admin</strong> / <strong style={{ color: 'var(--text-color)' }}>admin123</strong>
              </span>
              <button
                type="button"
                onClick={() => { setIdentifier('admin'); setPassword('admin123'); setError(''); }}
                style={{
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.6rem',
                  cursor: 'pointer'
                }}
              >
                Autofill
              </button>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading} 
              style={{ 
                width: '100%', 
                marginTop: '0.5rem', 
                padding: '0.85rem',
                borderRadius: '0.6rem',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(226, 55, 68, 0.35)'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Verifying Privileges...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Authenticate & Enter Console</span>
                </>
              )}
            </button>
          </form>

          {/* Security Disclaimer */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            textAlign: 'center',
            fontSize: '0.78rem',
            color: 'var(--text-secondary, #64748b)',
            lineHeight: 1.5
          }}>
            🔒 Protected by Rentora RBAC Security Middleware. Unauthorized access attempts are monitored and recorded.
          </div>
        </div>
      </div>
    </div>
  );
}
