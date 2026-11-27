import React from 'react';
import { ShieldCheck, Award, UserCheck, Lock, Star } from 'lucide-react';

export const AssuranceBanner = () => {
  const benefits = [
    {
      icon: UserCheck,
      title: "Multi-Level Verification",
      subtitle: "Email OTP, Phone, and Government ID checks ensure every renter and owner is accountable.",
      tag: "3-Step Trust"
    },
    {
      icon: Award,
      title: "Dynamic Trust Score",
      subtitle: "Transparent 0–100 Trust Score built from verifications, completed rentals, and peer reviews.",
      tag: "Reputation First"
    },
    {
      icon: Lock,
      title: "Refundable Security Deposits",
      subtitle: "High-value items are protected with clear refundable security deposits settled upon safe return.",
      tag: "Risk Protection"
    },
    {
      icon: ShieldCheck,
      title: "Owner Approval Workflow",
      subtitle: "Owners review renter Trust Score & rental history before approving high-value product bookings.",
      tag: "Owner Control"
    },
    {
      icon: Star,
      title: "Verified Reviews & History",
      subtitle: "Owners see completed rentals, peer ratings, and verification badges before approving bookings.",
      tag: "Proven Track Record"
    }
  ];

  return (
    <section className="assurance-banner-section" style={{ maxWidth: '1280px', margin: '3.5rem auto 1rem', padding: '0 1.5rem' }}>
      <div 
        className="assurance-banner-card panel"
        style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '24px',
          padding: '2.5rem',
          boxShadow: 'var(--card-shadow)',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--primary-glow)',
            color: 'var(--primary-color)',
            padding: '0.35rem 0.95rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 800,
            marginBottom: '0.65rem',
            border: '1px solid rgba(226, 55, 68, 0.2)'
          }}>
            <Award size={14} /> The Signature Experience on Rentora
          </div>
          <h2 style={{ fontSize: '1.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Why Choose <span style={{ color: 'var(--primary-color)' }}>Rentora</span>?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0.5rem 0 0', maxWidth: '580px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
            Enjoy the asset-light lifestyle: furnish your entire home, swap styles whenever you want, and never worry about accidental damage or moving hassles.
          </p>
        </div>

        {/* 5 Pillars Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem' }}>
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div 
                key={idx}
                className={b.isAction ? 'assurance-pillar assurance-pillar-action' : 'assurance-pillar'}
                style={{
                  background: b.isAction ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface-muted)',
                  border: b.isAction ? '1.5px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '1.5rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  cursor: b.isAction ? 'pointer' : 'default'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = b.isAction ? 'rgba(239, 68, 68, 0.35)' : 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: b.isAction ? 'var(--primary-color)' : 'rgba(239, 68, 68, 0.12)',
                    color: b.isAction ? '#ffffff' : 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}>
                    <Icon size={20} />
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: b.isAction ? 'var(--primary-color)' : '#10b981',
                    background: b.isAction ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                    border: b.isAction ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.2)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px'
                  }}>
                    {b.tag}
                  </span>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.4rem', color: 'var(--text-primary)' }}>
                  {b.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.45, margin: 0 }}>
                  {b.subtitle}
                </p>

                {b.isAction && (
                  <div style={{ marginTop: 'auto', paddingTop: '0.85rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>Explore UNLMTD Plans →</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
