import { publicFetch } from './utils/api';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Lock, 
  Mail, 
  Phone, 
  ArrowRight, 
  Home as HomeIcon, 
  CheckCircle2, 
  RotateCcw, 
  Edit3, 
  Loader2, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  Check,
  AlertCircle
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const RegisterPage = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone_num: '',
    password: '',
    role: 'customer' // 'customer' | 'owner'
  });

  // Step state: 'form' | 'otp'
  const [step, setStep] = useState('form');
  
  // 6 distinct OTP digits
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [activeDigitIndex, setActiveDigitIndex] = useState(0);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [otpInfo, setOtpInfo] = useState({ simulated: false, mock_otp: '' });
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const navigate = useNavigate();
  const digitInputRefs = useRef([]);

  // Timer for Resend OTP countdown
  useEffect(() => {
    let timer = null;
    if (step === 'otp' && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, resendCountdown]);

  // Focus the first input or active input when entering OTP step
  useEffect(() => {
    if (step === 'otp') {
      const firstEmptyIndex = otpDigits.findIndex(d => !d);
      const targetIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
      if (digitInputRefs.current[targetIndex]) {
        digitInputRefs.current[targetIndex].focus();
      }
    }
  }, [step]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1: Send Real-Time OTP to Gmail
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await publicFetch('/api/auth/send-signup-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setOtpInfo({
        simulated: data.simulated || false,
        mock_otp: data.mock_otp || ''
      });
      setStep('otp');
      setOtpDigits(['', '', '', '', '', '']);
      setResendCountdown(60);
      setCanResend(false);
      setSuccessMsg('Real-time verification code dispatched to your Gmail!');
    } catch (err) {
      setError(err.message || 'Error sending verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle individual digit input
  const handleDigitChange = (value, index) => {
    // Only allow single digit
    const cleaned = value.replace(/[^0-9]/g, '');
    const char = cleaned.slice(-1); // Take last character entered

    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setError('');

    if (char && index < 5) {
      // Advance to next box
      digitInputRefs.current[index + 1]?.focus();
      setActiveDigitIndex(index + 1);
    }

    // Auto-verify if all 6 digits are filled
    const fullOtp = newDigits.join('');
    if (fullOtp.length === 6) {
      triggerVerification(fullOtp);
    }
  };

  // Handle backspace navigation between boxes
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Move back and clear previous
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        digitInputRefs.current[index - 1]?.focus();
        setActiveDigitIndex(index - 1);
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
      setActiveDigitIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
      setActiveDigitIndex(index + 1);
    }
  };

  // Handle pasting full 6-digit code from clipboard
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (!pastedData) return;

    const chars = pastedData.slice(0, 6).split('');
    const newDigits = [...otpDigits];
    chars.forEach((c, i) => {
      if (i < 6) newDigits[i] = c;
    });
    setOtpDigits(newDigits);

    // Focus appropriate box
    const nextEmpty = newDigits.findIndex(d => !d);
    const focusIdx = nextEmpty === -1 ? 5 : nextEmpty;
    digitInputRefs.current[focusIdx]?.focus();
    setActiveDigitIndex(focusIdx);

    // Auto-submit if complete
    const fullOtp = newDigits.join('');
    if (fullOtp.length === 6) {
      triggerVerification(fullOtp);
    }
  };

  // Step 2: Trigger Verification
  const triggerVerification = async (codeToVerify) => {
    const finalCode = (codeToVerify || otpDigits.join('')).trim();
    if (finalCode.length !== 6) {
      setError('Please enter all 6 digits of the code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await publicFetch('/api/auth/verify-signup-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp: finalCode
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed. Invalid or expired code.');
      }

      // Success
      setVerifiedSuccess(true);
      setSuccessMsg('Identity verified! Preparing your dashboard...');

      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user_role', data.user?.role || formData.role);

      if (onLogin) {
        onLogin(data.access);
      }

      setTimeout(() => {
        if (formData.role === 'owner') {
          navigate('/owner');
        } else {
          navigate('/');
        }
      }, 1200);
    } catch (err) {
      setError(err.message || 'Invalid verification code. Please check your Gmail.');
      // Re-focus first input on error
      digitInputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualVerifySubmit = (e) => {
    e.preventDefault();
    triggerVerification(otpDigits.join(''));
  };

  // Resend code handler
  const handleResendOtp = async () => {
    if (!canResend || isLoading) return;
    setError('');
    setOtpDigits(['', '', '', '', '', '']);
    await handleRequestOtp();
    digitInputRefs.current[0]?.focus();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color, #f8fafc)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', zIndex: 100 }}>
        <ThemeToggle />
      </div>

      {/* Left side - Form & Top-Tier OTP Screen */}
      <div style={{ 
        flex: '1', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '2.5rem 1.5rem', 
        background: 'var(--surface-color, #ffffff)' 
      }}>
        <div className="animate-fade-in" style={{ width: '100%', maxWidth: '480px' }}>
          
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #e23744 0%, #b91c1c 100%)', 
              padding: '0.5rem', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              boxShadow: '0 8px 20px rgba(226, 55, 68, 0.28)' 
            }}>
              <HomeIcon size={22} color="white" />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#e23744', letterSpacing: '-0.03em' }}>
              Rent<span style={{ color: '#0f172a' }}>ora</span>
            </h2>
          </div>

          {/* Stepper Progress Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: step === 'otp' ? '#10b981' : '#e23744',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 800,
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}>
                {step === 'otp' ? <Check size={14} strokeWidth={3} /> : '1'}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: step === 'form' ? '#0f172a' : '#64748b' }}>
                Account
              </span>
            </div>

            <div style={{ width: '40px', height: '2px', background: step === 'otp' ? '#10b981' : '#e2e8f0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: step === 'otp' ? '#e23744' : '#f1f5f9',
                color: step === 'otp' ? '#ffffff' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 800,
                boxShadow: step === 'otp' ? '0 0 0 4px rgba(226, 55, 68, 0.15)' : 'none'
              }}>
                2
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: step === 'otp' ? '#e23744' : '#94a3b8' }}>
                Gmail Verify
              </span>
            </div>
          </div>

          {/* ========================================================
              STEP 1: REGISTRATION DETAILS FORM
              ======================================================== */}
          {step === 'form' && (
            <div>
              <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.4rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Create your account
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.925rem', margin: 0 }}>
                  Join Rentora to rent top-tier appliances & furniture with instant KYC.
                </p>
              </div>

              {error && (
                <div style={{ background: '#fef2f2', borderLeft: '4px solid #e23744', padding: '0.875rem 1rem', borderRadius: '0.75rem', marginBottom: '1.25rem', color: '#b91c1c', fontSize: '0.875rem' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                
                {/* Account Type Selector (Customer vs Owner) */}
                <div>
                  <label className="input-label" style={{ marginBottom: '0.4rem', display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                    I want to:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'customer' })}
                      style={{
                        padding: '0.85rem 0.6rem',
                        borderRadius: '12px',
                        border: formData.role === 'customer' ? '2px solid #e23744' : '1px solid #e2e8f0',
                        background: formData.role === 'customer' ? '#fff5f5' : '#f8fafc',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        boxShadow: formData.role === 'customer' ? '0 4px 14px rgba(226, 55, 68, 0.15)' : 'none'
                      }}
                    >
                      <div style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>👤</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: formData.role === 'customer' ? '#e23744' : '#334155' }}>
                        Rent Appliances
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Customer / Renter</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'owner' })}
                      style={{
                        padding: '0.85rem 0.6rem',
                        borderRadius: '12px',
                        border: formData.role === 'owner' ? '2px solid #10b981' : '1px solid #e2e8f0',
                        background: formData.role === 'owner' ? '#ecfdf5' : '#f8fafc',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        boxShadow: formData.role === 'owner' ? '0 4px 14px rgba(16, 185, 129, 0.15)' : 'none'
                      }}
                    >
                      <div style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>💼</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: formData.role === 'owner' ? '#059669' : '#334155' }}>
                        List & Earn
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Appliance Owner</div>
                    </button>
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="input-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>Username</label>
                  <div style={{ position: 'relative' }}>
                    <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', width: '1.15rem', height: '1.15rem' }} />
                    <input 
                      type="text" 
                      name="username"
                      className="input-field" 
                      placeholder="Choose a username" 
                      value={formData.username}
                      onChange={handleChange}
                      style={{ paddingLeft: '2.85rem', borderRadius: '12px' }}
                      required 
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="input-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Gmail Address</span>
                    <span style={{ fontSize: '0.75rem', color: '#e23744', fontWeight: 600 }}>⚡ Real-Time OTP Verified</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', width: '1.15rem', height: '1.15rem' }} />
                    <input 
                      type="email" 
                      name="email"
                      className="input-field" 
                      placeholder="Enter your Gmail (e.g. name@gmail.com)" 
                      value={formData.email}
                      onChange={handleChange}
                      style={{ paddingLeft: '2.85rem', borderRadius: '12px' }}
                      required 
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="input-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>Phone Number (Optional)</label>
                  <div style={{ position: 'relative' }}>
                    <Phone style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', width: '1.15rem', height: '1.15rem' }} />
                    <input 
                      type="tel" 
                      name="phone_num"
                      className="input-field" 
                      placeholder="Enter 10-digit mobile number" 
                      value={formData.phone_num}
                      onChange={handleChange}
                      style={{ paddingLeft: '2.85rem', borderRadius: '12px' }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="input-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', width: '1.15rem', height: '1.15rem' }} />
                    <input 
                      type="password" 
                      name="password"
                      className="input-field" 
                      placeholder="Create a password (min 6 characters)" 
                      value={formData.password}
                      onChange={handleChange}
                      style={{ paddingLeft: '2.85rem', borderRadius: '12px' }}
                      required 
                    />
                  </div>
                </div>

                {/* Continue Button */}
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isLoading} 
                  style={{ 
                    width: '100%', 
                    marginTop: '0.75rem', 
                    padding: '0.95rem', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.5rem',
                    fontWeight: 800,
                    fontSize: '1rem',
                    boxShadow: '0 8px 20px rgba(226, 55, 68, 0.28)'
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue & Verify Gmail</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ========================================================
              STEP 2: STATE-OF-THE-ART REAL-TIME OTP SCREEN
              ======================================================== */}
          {step === 'otp' && (
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid #e2e8f0',
              padding: '2.25rem 1.75rem',
              boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.03)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Top Accent Gradient Bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #e23744 0%, #f97316 50%, #10b981 100%)'
              }} />

              {/* Verified Success State Overlay */}
              {verifiedSuccess ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', animation: 'fadeIn 0.25s ease' }}>
                  <div style={{
                    width: '76px',
                    height: '76px',
                    background: '#dcfce7',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.25rem',
                    border: '4px solid #bbf7d0',
                    boxShadow: '0 10px 25px rgba(22, 163, 74, 0.25)'
                  }}>
                    <CheckCircle2 size={42} color="#16a34a" />
                  </div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
                    Gmail Verified!
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 1.5rem' }}>
                    Welcome to Rentora. Your account is active and ready.
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', background: '#f0fdf4', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700 }}>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Redirecting to your dashboard...</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Floating Header Icon */}
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                      width: '68px',
                      height: '68px',
                      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1.25rem',
                      boxShadow: '0 8px 20px rgba(226, 55, 68, 0.18)',
                      border: '1px solid #fca5a5',
                      position: 'relative'
                    }}>
                      <Mail size={32} color="#e23744" />
                      <span style={{
                        position: 'absolute',
                        top: '-3px',
                        right: '-3px',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: '#10b981',
                        border: '2px solid #ffffff',
                        boxShadow: '0 0 8px #10b981'
                      }} />
                    </div>

                    <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>
                      Check your Gmail inbox
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                      We sent a 6-digit verification code to:
                    </p>

                    {/* Email Pill Badge with Edit & Open Gmail Shortcut */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        padding: '0.4rem 0.85rem',
                        borderRadius: '999px',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: '#1e293b'
                      }}>
                        <span style={{ color: '#e23744' }}>●</span>
                        <span>{formData.email}</span>
                        <button
                          type="button"
                          onClick={() => { setStep('form'); setError(''); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px 4px',
                            marginLeft: '2px',
                            borderRadius: '4px'
                          }}
                          title="Change Email"
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>

                      {/* Direct "Open Gmail" shortcut button */}
                      <a
                        href="https://mail.google.com"
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          textDecoration: 'none',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                      >
                        <span>Open Gmail</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  {/* Dev Simulation Badge (Shown only if Gmail credentials not configured) */}
                  {otpInfo.simulated && otpInfo.mock_otp && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      border: '1px solid #f59e0b',
                      borderRadius: '14px',
                      padding: '0.75rem 1rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem',
                      color: '#92400e'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                        <Sparkles size={16} color="#d97706" />
                        <span>Dev Mode Active</span>
                      </div>
                      <div style={{
                        background: '#ffffff',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '1rem',
                        letterSpacing: '2px',
                        color: '#b45309',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                      }}>
                        {otpInfo.mock_otp}
                      </div>
                    </div>
                  )}

                  {/* Error Notification */}
                  {error && (
                    <div style={{
                      background: '#fef2f2',
                      borderLeft: '4px solid #e23744',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      marginBottom: '1.25rem',
                      color: '#b91c1c',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleManualVerifySubmit}>
                    
                    {/* 6 SPLIT DIGIT BOXES (Stripe/Uber Standard) */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{
                        display: 'block',
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: '0.85rem'
                      }}>
                        Enter 6-Digit Verification Code
                      </label>

                      <div 
                        onPaste={handlePaste}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.55rem'
                        }}
                      >
                        {otpDigits.map((digit, idx) => (
                          <React.Fragment key={idx}>
                            <input
                              ref={(el) => (digitInputRefs.current[idx] = el)}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleDigitChange(e.target.value, idx)}
                              onKeyDown={(e) => handleKeyDown(e, idx)}
                              onFocus={() => setActiveDigitIndex(idx)}
                              style={{
                                width: '50px',
                                height: '58px',
                                textAlign: 'center',
                                fontSize: '1.75rem',
                                fontWeight: 800,
                                fontFamily: "'Courier New', Courier, monospace",
                                borderRadius: '12px',
                                border: digit ? '2px solid #e23744' : activeDigitIndex === idx ? '2px solid #3b82f6' : '1.5px solid #cbd5e1',
                                background: digit ? '#fff5f5' : '#ffffff',
                                color: '#0f172a',
                                outline: 'none',
                                transition: 'all 0.15s ease',
                                boxShadow: activeDigitIndex === idx 
                                  ? '0 0 0 4px rgba(226, 55, 68, 0.15)' 
                                  : digit 
                                    ? '0 2px 8px rgba(226, 55, 68, 0.1)' 
                                    : '0 1px 2px rgba(0,0,0,0.03)'
                              }}
                            />
                            {/* Visual Divider Dot between digits 3 and 4 */}
                            {idx === 2 && (
                              <div style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#cbd5e1',
                                margin: '0 0.15rem'
                              }} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.75rem' }}>
                        💡 Tip: You can paste the code directly from Gmail
                      </p>
                    </div>

                    {/* Resend & Timer Footer */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '0.75rem 1rem',
                      marginBottom: '1.5rem',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b' }}>
                        <span>Didn't get the email?</span>
                      </div>

                      {canResend ? (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isLoading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#e23744',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: 0
                          }}
                        >
                          <RotateCcw size={14} />
                          <span>Resend New Code</span>
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontWeight: 600 }}>
                          <span>Resend in</span>
                          <span style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                            fontWeight: 800,
                            color: '#0f172a',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            {resendCountdown}s
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Confirm Button */}
                    <button
                      type="submit"
                      disabled={isLoading || otpDigits.join('').length !== 6}
                      className="btn-primary"
                      style={{
                        width: '100%',
                        padding: '0.95rem',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontWeight: 800,
                        fontSize: '1rem',
                        boxShadow: '0 8px 20px rgba(226, 55, 68, 0.28)',
                        opacity: (isLoading || otpDigits.join('').length !== 6) ? 0.6 : 1,
                        cursor: (isLoading || otpDigits.join('').length !== 6) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Verifying Your Code...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={18} />
                          <span>Confirm & Complete Registration</span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* Bottom Sign-In Link */}
          <p style={{ textAlign: 'center', marginTop: '1.75rem', color: '#64748b', fontSize: '0.875rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#e23744', textDecoration: 'none', fontWeight: '700' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual Showcase */}
      <div style={{ flex: '1', display: 'none', position: 'relative' }} className="auth-image-container">
        <img 
          src="https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&q=80&w=1200" 
          alt="Beautiful apartment" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.1), rgba(0,0,0,0.75))' }}></div>
        <div style={{ position: 'absolute', bottom: '4rem', right: '4rem', color: 'white', maxWidth: '440px', textAlign: 'right' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
            <ShieldCheck size={16} color="#4ade80" /> Verified Renter Network
          </div>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'white', fontWeight: 800, lineHeight: 1.2 }}>
            Transform your living space today.
          </h2>
          <p style={{ fontSize: '1.05rem', opacity: 0.9, lineHeight: 1.6 }}>
            Real-time verified accounts, zero security deposit options, and flexible tenure plans.
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .auth-image-container { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;
