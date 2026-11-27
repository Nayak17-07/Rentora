import { showToast } from './utils/toast';
import { publicFetch } from './utils/api';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Home as HomeIcon, KeyRound, CheckCircle, X, ShieldAlert } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Password Reset state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: enter email, 2: enter otp & new password
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await publicFetch('/api/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(data.error || 'Too many login attempts. Please wait 15 minutes.');
        }
        throw new Error(data.detail || data.error || 'Invalid credentials');
      }
      
      const role = data.user?.role || 'customer';
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user_role', role);
      if (role === 'owner') {
        localStorage.setItem('is_owner', 'true');
      } else {
        localStorage.removeItem('is_owner');
      }
      if (data.user?.username) {
        localStorage.setItem('username', data.user.username);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      onLogin(data.access);

      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'owner') {
        navigate('/owner', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestResetOtp = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetMessage('');

    try {
      const res = await publicFetch('/api/auth/password-reset-request/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset code');
      }
      setResetMessage(`Reset verification code generated! ${data.mock_otp ? `(Demo OTP: ${data.mock_otp})` : 'Check your inbox.'}`);
      setResetStep(2);
      if (data.mock_otp) {
        setResetOtp(data.mock_otp);
      }
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');

    try {
      const res = await publicFetch('/api/auth/password-reset-confirm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp: resetOtp, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      showToast.success('Password reset successfully! You can now sign in with your new password.', 'Password Reset');
      setShowForgotModal(false);
      setResetStep(1);
      setResetEmail('');
      setResetOtp('');
      setNewPassword('');
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', zIndex: 100 }}>
        <ThemeToggle />
      </div>

      {/* Left side - Image */}
      <div style={{ flex: '1', display: 'none', '@media (minWidth: 768px)': { display: 'block' }, position: 'relative' }} className="auth-image-container">
        <img 
          src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1200" 
          alt="Beautiful interior" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.4), transparent)' }}></div>
        <div style={{ position: 'absolute', bottom: '4rem', left: '4rem', color: 'white', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'white' }}>Furnish your dream home, effortlessly.</h2>
          <p style={{ fontSize: '1.125rem', opacity: 0.9 }}>Join thousands of users who have upgraded their lifestyle with Rentora.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem', background: 'var(--surface-color, white)' }}>
        <div className="animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3rem', justifyContent: 'center' }}>
            <div style={{ background: 'var(--primary-color)', padding: '0.4rem', borderRadius: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HomeIcon size={20} color="white" />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-color)' }}>Rentora</h2>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--secondary-color)' }}>
              Welcome back
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Sign in to manage your rentals and packages.</p>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', borderLeft: '4px solid var(--primary-color)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', color: '#b91c1c', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="input-label">Username</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', width: '1.25rem', height: '1.25rem' }} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Enter your username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ paddingLeft: '3rem' }}
                  required 
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label">Password</label>
                <button 
                  type="button"
                  onClick={() => { setShowForgotModal(true); setResetStep(1); setResetError(''); setResetMessage(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.875rem', color: 'var(--primary-color)', fontWeight: '500' }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', width: '1.25rem', height: '1.25rem' }} />
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '3rem' }}
                  required 
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: '100%', marginTop: '0.5rem', padding: '0.875rem' }}>
              {isLoading ? 'Signing in...' : 'Sign In'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '600' }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showForgotModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '440px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowForgotModal(false)}
              style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: '#fee2e2', padding: '0.6rem', borderRadius: '50%', color: 'var(--primary-color)' }}>
                <KeyRound size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--secondary-color)' }}>Reset Password</h3>
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  {resetStep === 1 ? 'Enter your email to receive an OTP code' : 'Verify code & choose a new password'}
                </p>
              </div>
            </div>

            {resetError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {resetError}
              </div>
            )}

            {resetMessage && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem', borderRadius: '8px', color: '#166534', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {resetMessage}
              </div>
            )}

            {resetStep === 1 ? (
              <form onSubmit={handleRequestResetOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">Registered Account Email</label>
                  <input 
                    type="email" 
                    className="input-field" 
                    placeholder="name@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={resetLoading} style={{ padding: '0.75rem' }}>
                  {resetLoading ? 'Sending Code...' : 'Send Verification OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">6-Digit Verification OTP</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Enter 6-digit OTP"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">New Password</label>
                  <input 
                    type="password" 
                    className="input-field" 
                    placeholder="Create a strong new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={resetLoading} style={{ padding: '0.75rem' }}>
                  {resetLoading ? 'Updating Password...' : 'Reset & Save Password'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setResetStep(1)}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  ← Back to Email
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        @media (max-width: 768px) {
          .auth-image-container { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;

