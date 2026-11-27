import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  Loader2,
  Home as HomeIcon,
  CheckCircle2,
  ChevronLeft,
  Clock,
  AlertCircle,
  RefreshCw,
  BadgeCheck
} from 'lucide-react';
import { fetchWithAuth } from './utils/api';
import ThemeToggle from './ThemeToggle';
import TrustProfileCard from './TrustProfileCard';

const PageShell = ({ children, trustProfile, onProfileUpdated }) => (
  <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)', display: 'flex', flexDirection: 'column' }}>
    <nav style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0.875rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
          <div style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', padding: '0.5rem', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(239,68,68,0.25)' }}>
            <HomeIcon size={20} color="white" />
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Rent<span style={{ color: '#ef4444' }}>ora</span>
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ThemeToggle />
          <Link to="/cart" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.88rem', fontWeight: 600, color: '#475569', textDecoration: 'none', border: '1px solid #e2e8f0', padding: '0.5rem 0.9rem', borderRadius: '0.6rem', background: '#fff' }}>
            <ChevronLeft size={15} /> Back to Cart
          </Link>
        </div>
      </div>
    </nav>

    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', gap: '1.5rem' }}>
      {trustProfile && (
        <div style={{ maxWidth: '720px', width: '100%' }}>
          <TrustProfileCard profile={trustProfile} editable={true} onProfileUpdated={onProfileUpdated} />
        </div>
      )}
      {children}
    </main>

    <footer style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.78rem', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
      © 2026 Rentora · Identity Verification &amp; Trust System
    </footer>
  </div>
);

const cardStyle = {
  background: '#ffffff',
  borderRadius: '1.5rem',
  border: '1px solid #e2e8f0',
  boxShadow: '0 20px 40px -15px rgba(15,23,42,0.08)',
  maxWidth: '720px',
  width: '100%',
  padding: '2.5rem',
  position: 'relative',
  overflow: 'hidden'
};

const inputStyle = {
  width: '100%',
  padding: '0.8rem 1rem',
  borderRadius: '0.75rem',
  border: '1.5px solid #e2e8f0',
  fontSize: '0.95rem',
  outline: 'none',
  background: '#f8fafc',
  color: '#0f172a',
  boxSizing: 'border-box'
};

const KYCPage = () => {
  const [initialLoading, setInitialLoading] = useState(true);
  const [kycData, setKycData] = useState(null);
  const [trustProfile, setTrustProfile] = useState(null);
  const [isReverifying, setIsReverifying] = useState(false);

  // Level 1 Manual ID + Selfie Upload State
  const [fullName, setFullName] = useState('');
  const [idType, setIdType] = useState('Aadhaar Card');
  const [idPreview, setIdPreview] = useState('');
  const [selfiePreview, setSelfiePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchKyc = async (silent = false) => {
    try {
      if (!silent) setInitialLoading(true);
      const [res, trustRes] = await Promise.all([
        fetchWithAuth('/api/kyc/'),
        fetchWithAuth('/api/trust/profile/').catch(() => null)
      ]);
      if (res.ok) {
        const data = await res.json();
        setKycData(data);
      }
      if (trustRes && trustRes.ok) {
        const tData = await trustRes.json().catch(() => null);
        if (tData) setTrustProfile(tData);
      }
    } catch (e) {
      console.error('KYC fetch error:', e);
    } finally {
      if (!silent) setInitialLoading(false);
    }
  };

  useEffect(() => { fetchKyc(false); }, []);

  // Poll every 5 seconds while submission is in review
  useEffect(() => {
    if (kycData?.status !== 'in_review') return;
    const interval = setInterval(() => fetchKyc(true), 5000);
    return () => clearInterval(interval);
  }, [kycData?.status]);

  const handleFileRead = (file, setter) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name as shown on your ID.');
      return;
    }
    if (!idPreview || !selfiePreview) {
      setErrorMsg('Please upload both your Government ID photo and a Selfie holding your ID.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/kyc/manual-upload', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName.trim(),
          id_type: idType,
          id_proof_base64: idPreview,
          selfie_base64: selfiePreview
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit ID for review');
      setIsReverifying(false);
      await fetchKyc(false);
    } catch (err) {
      setErrorMsg(err.message || 'Network error while uploading verification documents.');
    } finally {
      setSubmitting(false);
    }
  };

  const isApproved = kycData?.status === 'approved' && !isReverifying;
  const isInReview = kycData?.status === 'in_review' && !isReverifying;

  return (
    <PageShell trustProfile={trustProfile} onProfileUpdated={setTrustProfile}>
      {initialLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <Loader2 className="animate-spin" size={38} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#64748b', fontWeight: 600 }}>Loading identity verification status...</p>
        </div>
      ) : isInReview ? (
        <div style={cardStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: 'linear-gradient(90deg, #f59e0b, #d97706)' }} />
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: '80px', height: '80px', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: '4px solid #fde68a' }}>
              <Clock size={42} color="#d97706" />
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fef3c7', color: '#b45309', padding: '0.35rem 0.9rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              PENDING ADMIN APPROVAL
            </span>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
              Documents Submitted for Review
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
              Your <strong>{kycData.id_type || 'Government ID'}</strong> and selfie for <strong>{kycData.full_name}</strong> are awaiting administrator review. This page updates automatically once approved.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsReverifying(true)}
                style={{ background: '#ffffff', color: '#475569', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '0.7rem 1.2rem', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Re-upload Documents
              </button>
              <Link
                to="/"
                style={{ background: '#f1f5f9', color: '#334155', textDecoration: 'none', borderRadius: '10px', padding: '0.7rem 1.2rem', fontSize: '0.88rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <span>Browse Catalog</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      ) : isApproved ? (
        <div style={cardStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: 'linear-gradient(90deg,#10b981,#059669)' }} />
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <div style={{ width: '80px', height: '80px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: '4px solid #bbf7d0' }}>
              <CheckCircle2 size={44} color="#16a34a" />
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#dcfce7', color: '#15803d', padding: '0.35rem 0.9rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              <BadgeCheck size={15} /> ID VERIFIED
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
              Identity Verified!
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '460px', margin: '0 auto 1.5rem' }}>
              <strong>{kycData.full_name}</strong> ({kycData.id_type || 'Government ID'}) has been verified and approved.
            </p>
            <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to="/cart"
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white', padding: '0.85rem 1.75rem', borderRadius: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>Proceed to Cart</span>
                <ArrowRight size={17} />
              </Link>
              <button
                type="button"
                onClick={() => setIsReverifying(true)}
                style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '0.75rem', padding: '0.85rem 1.25rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={15} /> Re-verify
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={cardStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: 'linear-gradient(90deg,#ef4444,#f97316,#10b981)' }} />
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
              Identity Verification
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
              Upload your Government ID (Aadhaar, Driving License, or Passport) and a Selfie for admin review.
            </p>
          </div>

          {kycData?.status === 'rejected' && (
            <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '0.85rem 1rem', borderRadius: '0.5rem', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>Previous submission was declined{kycData.rejection_reason ? `: ${kycData.rejection_reason}` : '.'} Please re-upload clear images.</span>
            </div>
          )}

          {errorMsg && (
            <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '0.75rem 1rem', borderRadius: '0.5rem', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Full Name (as on ID)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Document Type
              </label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                style={inputStyle}
              >
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="Driving License">Driving License</option>
                <option value="Passport">Passport</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Government ID Photo *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileRead(e.target.files?.[0], setIdPreview)}
                required={!idPreview}
              />
              {idPreview && (
                <img src={idPreview} alt="ID Preview" style={{ marginTop: '0.6rem', maxHeight: '140px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Selfie Holding ID *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileRead(e.target.files?.[0], setSelfiePreview)}
                required={!selfiePreview}
              />
              {selfiePreview && (
                <img src={selfiePreview} alt="Selfie Preview" style={{ marginTop: '0.6rem', maxHeight: '140px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ width: '100%', padding: '0.9rem', borderRadius: '0.85rem', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              <span>{submitting ? 'Uploading for Admin Review...' : 'Submit ID & Selfie for Review'}</span>
            </button>
          </form>
        </div>
      )}
    </PageShell>
  );
};

export default KYCPage;
