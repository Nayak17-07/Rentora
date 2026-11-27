import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Phone,
  IdCard,
  CheckCircle2,
  Clock,
  Star,
  Calendar,
  PackageCheck,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { fetchWithAuth } from './utils/api';

const TrustProfileCard = ({ profile, editable = false, onProfileUpdated, compact = false }) => {
  const [phoneInput, setPhoneInput] = useState('');
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  if (!profile) return null;

  const {
    username,
    joined_at,
    trust_score = 0,
    verification_status = 'Unverified',
    verifications = {},
    stats = {}
  } = profile;

  const scoreColor = trust_score >= 75 ? '#10b981' : trust_score >= 45 ? '#f59e0b' : '#ef4444';

  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    setPhoneLoading(true);
    try {
      const res = await fetchWithAuth('/api/trust/verify-phone/', {
        method: 'POST',
        body: JSON.stringify({ phone_num: phoneInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify phone');
      setActionSuccess(data.success);
      setShowPhoneForm(false);
      if (onProfileUpdated) onProfileUpdated(data.profile);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <div style={{
      background: 'var(--surface-color, #ffffff)',
      border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '16px',
      padding: compact ? '1rem' : '1.5rem',
      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)'
    }}>
      {/* Header Row: Trust Score + Identity */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: `${scoreColor}18`,
            border: `1.5px solid ${scoreColor}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: scoreColor
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: compact ? '0.95rem' : '1.1rem', color: 'var(--text-primary, #0f172a)' }}>
                {username ? `${username}'s Trust Profile` : 'Trust & Verification Profile'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.25rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={13} /> Joined: <strong>{joined_at || 'Jan 2026'}</strong>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <PackageCheck size={13} /> Rentals Completed: <strong>{stats.rentals_completed ?? 0}</strong>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Star size={13} color="#f59e0b" fill="#f59e0b" /> Rating: <strong>{stats.avg_rating ? `${stats.avg_rating}` : 'New'}</strong>
              </span>
              <span>
                Status: <strong style={{ color: scoreColor }}>{verification_status}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Trust Score Pill */}
        <div style={{
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: '14px',
          padding: '0.6rem 1rem',
          textAlign: 'center',
          minWidth: '125px'
        }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
            Trust Score
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: scoreColor, lineHeight: 1.1 }}>
            {trust_score}<span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>/100</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ height: '6px', background: 'var(--surface-muted, #f1f5f9)', borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem' }}>
        <div style={{ width: `${trust_score}%`, height: '100%', background: scoreColor, transition: 'width 0.3s ease' }} />
      </div>

      {/* Verification Badges Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '0.65rem' }}>
        {[
          {
            key: 'email',
            label: 'Email Verified',
            verified: verifications.email_verified,
            icon: Mail,
            pts: '+25'
          },
          {
            key: 'phone',
            label: 'Phone Verified',
            verified: verifications.phone_verified,
            icon: Phone,
            pts: '+25',
            action: editable && !verifications.phone_verified ? () => setShowPhoneForm(v => !v) : null,
            actionLabel: 'Verify Phone'
          },
          {
            key: 'gov',
            label: 'Government ID Verified',
            verified: verifications.gov_id_verified,
            icon: IdCard,
            pts: '+20',
            link: editable && !verifications.gov_id_verified ? '/kyc' : null,
            actionLabel: 'Verify ID'
          }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              padding: '0.55rem 0.75rem',
              borderRadius: '10px',
              background: item.verified ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-muted, #f8fafc)',
              border: `1px solid ${item.verified ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color, #e2e8f0)'}`,
              fontSize: '0.78rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Icon size={15} color={item.verified ? '#10b981' : '#64748b'} />
                <span style={{ fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>{item.label}</span>
              </div>
              {item.verified ? (
                <CheckCircle2 size={16} color="#10b981" />
              ) : item.action ? (
                <button
                  type="button"
                  onClick={item.action}
                  style={{
                    background: '#e23744',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {item.actionLabel}
                </button>
              ) : item.link ? (
                <Link
                  to={item.link}
                  style={{
                    background: '#e23744',
                    color: '#ffffff',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}
                >
                  {item.actionLabel}
                </Link>
              ) : (
                <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Clock size={12} /> {item.pts}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {actionError && (
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: '8px', background: '#fef2f2', color: '#b91c1c', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertCircle size={15} /> {actionError}
        </div>
      )}
      {actionSuccess && (
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: '8px', background: '#ecfdf5', color: '#065f46', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <CheckCircle2 size={15} /> {actionSuccess}
        </div>
      )}

      {/* Inline Phone Verification Form */}
      {editable && showPhoneForm && (
        <form onSubmit={handleVerifyPhone} style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.75rem', background: 'var(--surface-muted, #f8fafc)', borderRadius: '10px' }}>
          <input
            type="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="Enter 10-digit mobile number"
            className="input-field"
            style={{ flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem', borderRadius: '8px' }}
            required
          />
          <button type="submit" disabled={phoneLoading} className="btn-primary" style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            {phoneLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            <span>Verify Phone (+25 pts)</span>
          </button>
        </form>
      )}
    </div>
  );
};

export default TrustProfileCard;
