import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Award, 
  ShieldCheck, 
  ArrowRight, 
  Check, 
  CreditCard, 
  TrendingDown, 
  Clock, 
  Zap, 
  Calendar, 
  Layers, 
  Loader2,
  DollarSign
} from 'lucide-react';
import { fetchWithAuth } from './utils/api';

export default function RentToOwnModal({ rental, onClose, onBuyoutSuccess, onTenureExtended }) {
  const [activeTab, setActiveTab] = useState('buyout'); // 'buyout' | 'extend'
  const [selectedTenure, setSelectedTenure] = useState('12');
  const [paymentMethod, setPaymentMethod] = useState('UPI_INSTANT');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!rental) return null;

  const app = rental.appliance || {};
  const applianceName = app.rental_name || rental.rental_name || 'Home Appliance';
  const monthlyRent = parseFloat(rental.monthly_rent || app.monthly_price || 500);
  const currentTenure = rental.tenure || '3';
  const securityDeposit = parseFloat(rental.security_deposit || Math.round(monthlyRent * 1.5));

  // Amortization Math for Buyout
  const mrp = parseFloat(app.original_price || app.purchase_price || (monthlyRent * 14));
  const rentedAt = rental.rented_at ? new Date(rental.rented_at) : new Date();
  const diffMs = Math.max(0, Date.now() - rentedAt.getTime());
  const monthsRented = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)));

  const accumulatedRent = Math.round(monthlyRent * monthsRented);
  const equityCredit = Math.round(accumulatedRent * 0.70); // 70% of rent credited towards ownership!
  const heldDeposit = securityDeposit;

  const residualBase = Math.max(500, Math.round(mrp - equityCredit - heldDeposit));
  const gstAmount = Math.round(residualBase * 0.18);
  const finalBuyoutTotal = Math.round(residualBase + gstAmount);

  // Tenure Extension Math
  const getExtendedPrice = (t) => {
    if (app.pricing && app.pricing[t]) return app.pricing[t];
    if (t === '12') return Math.round(monthlyRent * 0.80);
    if (t === '6') return Math.round(monthlyRent * 0.90);
    return monthlyRent;
  };

  const newRent12 = getExtendedPrice('12');
  const newRent6 = getExtendedPrice('6');
  const targetRent = selectedTenure === '12' ? newRent12 : newRent6;
  const monthlySavings = Math.max(0, monthlyRent - targetRent);

  // Handle Buyout Execution
  const handleConfirmBuyout = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const res = await fetchWithAuth('/api/rentals/', {
        method: 'PATCH',
        body: JSON.stringify({
          rental_id: rental.rental_id,
          action: 'buyout',
          payment_method: paymentMethod
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (onBuyoutSuccess) {
          onBuyoutSuccess({
            ...rental,
            status: 'OWNED',
            certificate_id: data.certificate_id,
            buyout_details: data.buyout_details,
            ownership_transfer_date: new Date()
          });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || 'Failed to complete buyout transaction.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Network error processing buyout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Tenure Extension Execution
  const handleConfirmExtension = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const res = await fetchWithAuth('/api/rentals/', {
        method: 'PATCH',
        body: JSON.stringify({
          rental_id: rental.rental_id,
          action: 'extend_tenure',
          new_tenure: selectedTenure
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (onTenureExtended) {
          onTenureExtended(data);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || 'Failed to extend tenure.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Network error extending tenure. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1250,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        maxWidth: '680px',
        width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
        position: 'relative',
        maxHeight: '92vh',
        overflowY: 'auto'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '1.25rem',
            top: '1.25rem',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            zIndex: 10
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Top Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          color: '#ffffff',
          padding: '2rem 2.5rem 1.5rem',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          position: 'relative'
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem', color: '#fef08a' }}>
            <Sparkles size={14} />
            <span>Rentora Asset Equity Program</span>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
            {activeTab === 'buyout' ? 'Rent-to-Own Equity Buyout' : 'Tenure Extension & Rent Discount'}
          </h2>
          <p style={{ color: '#c7d2fe', fontSize: '0.85rem', margin: '0.35rem 0 1rem', lineHeight: 1.4 }}>
            {activeTab === 'buyout'
              ? 'Convert your rental into permanent ownership with 70% rent equity credit + 100% deposit offset.'
              : 'Extend your rental contract to 6 or 12 months to instantly reduce next month\'s subscription price.'}
          </p>

          {/* Mode Switcher Tabs */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', padding: '3px', borderRadius: '12px', width: 'fit-content' }}>
            <button
              onClick={() => setActiveTab('buyout')}
              style={{
                background: activeTab === 'buyout' ? '#ffffff' : 'transparent',
                color: activeTab === 'buyout' ? '#1e1b4b' : '#c7d2fe',
                border: 'none',
                borderRadius: '9px',
                padding: '0.45rem 1.15rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              💎 Own It (Buyout)
            </button>
            <button
              onClick={() => setActiveTab('extend')}
              style={{
                background: activeTab === 'extend' ? '#ffffff' : 'transparent',
                color: activeTab === 'extend' ? '#1e1b4b' : '#c7d2fe',
                border: 'none',
                borderRadius: '9px',
                padding: '0.45rem 1.15rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              ⚡ Extend & Save 20%
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.75rem 2.25rem 2.25rem' }}>

          {/* Appliance Quick Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <img
              src={app.image_url || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'}
              alt={applianceName}
              style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '12px' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                {app.category_id || 'Appliances'} • Current Lease: {currentTenure} Months
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {applianceName}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.15rem' }}>
                Rented since: {rentedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • Current Rent: <strong>₹{monthlyRent}/mo</strong>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {errorMsg}
            </div>
          )}

          {/* TAB 1: RENT-TO-OWN BUYOUT */}
          {activeTab === 'buyout' && (
            <div>
              {/* Amortization Ledger */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <TrendingDown size={16} color="#4338ca" />
                  <span>Amortization & Equity Credit Calculation:</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Estimated Retail Value (MRP):</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{mrp.toLocaleString('en-IN')}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Accumulated Rent Paid ({monthsRented} month{monthsRented > 1 ? 's' : ''}):</span>
                    <span>₹{accumulatedRent.toLocaleString('en-IN')}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600, background: '#f0fdf4', padding: '0.35rem 0.5rem', borderRadius: '6px' }}>
                    <span>70% Rental Equity Credit Deducted:</span>
                    <span>-₹{equityCredit.toLocaleString('en-IN')}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb', fontWeight: 600, background: '#eff6ff', padding: '0.35rem 0.5rem', borderRadius: '6px' }}>
                    <span>Escrow Security Deposit Applied (100%):</span>
                    <span>-₹{heldDeposit.toLocaleString('en-IN')}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>GST (18% on residual capital base):</span>
                    <span>+₹{gstAmount.toLocaleString('en-IN')}</span>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderTop: '2px dashed #cbd5e1',
                    paddingTop: '0.75rem',
                    marginTop: '0.35rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>Final Settlement to Own:</div>
                      <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Zero future rent • Lifetime ownership transfer</div>
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#4338ca' }}>
                      ₹{finalBuyoutTotal.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ownership Benefits */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', fontSize: '0.78rem', color: '#334155' }}>
                  <ShieldCheck size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span><strong>1-Year Warranty Transferred:</strong> Free spare replacements & technician visits.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', fontSize: '0.78rem', color: '#334155' }}>
                  <Award size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span><strong>Assured Buyback Guarantee:</strong> Sell back to Rentora anytime for up to 60% cash.</span>
                </div>
              </div>

              {/* Action Button */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmBuyout}
                  style={{
                    flex: 2,
                    padding: '0.85rem 1.25rem',
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: isProcessing ? 'wait' : 'pointer',
                    boxShadow: '0 4px 14px rgba(67, 56, 202, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s'
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Clearing Title & Payment...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay ₹{finalBuyoutTotal.toLocaleString('en-IN')} & Claim Title</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TENURE EXTENSION */}
          {activeTab === 'extend' && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '0.65rem' }}>
                  Choose Your Extended Rental Commitment:
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* 6 Months Option */}
                  <div
                    onClick={() => setSelectedTenure('6')}
                    style={{
                      border: selectedTenure === '6' ? '2px solid #4338ca' : '1.5px solid #e2e8f0',
                      background: selectedTenure === '6' ? '#eef2ff' : '#ffffff',
                      borderRadius: '14px',
                      padding: '1.15rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    <span style={{ position: 'absolute', top: '10px', right: '10px', background: '#dbeafe', color: '#1d4ed8', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                      10% OFF
                    </span>
                    <div style={{ fontWeight: 800, color: '#1e1b4b', fontSize: '1rem' }}>6 Months Commitment</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#4338ca', marginTop: '0.35rem' }}>
                      ₹{newRent6}<span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>/mo</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '0.2rem' }}>
                      Save ₹{Math.max(0, monthlyRent - newRent6)}/month
                    </div>
                  </div>

                  {/* 12 Months Option */}
                  <div
                    onClick={() => setSelectedTenure('12')}
                    style={{
                      border: selectedTenure === '12' ? '2px solid #4338ca' : '1.5px solid #e2e8f0',
                      background: selectedTenure === '12' ? '#eef2ff' : '#ffffff',
                      borderRadius: '14px',
                      padding: '1.15rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    <span style={{ position: 'absolute', top: '10px', right: '10px', background: '#dcfce7', color: '#15803d', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                      20% MAX SAVINGS
                    </span>
                    <div style={{ fontWeight: 800, color: '#1e1b4b', fontSize: '1rem' }}>12 Months Commitment</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#4338ca', marginTop: '0.35rem' }}>
                      ₹{newRent12}<span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>/mo</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '0.2rem' }}>
                      Save ₹{Math.max(0, monthlyRent - newRent12)}/month
                    </div>
                  </div>
                </div>
              </div>

              {/* Savings Summary Banner */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#64748b' }}>Current Baseline Rent:</span>
                  <span style={{ fontWeight: 600 }}>₹{monthlyRent}/mo</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#64748b' }}>New Monthly Rate:</span>
                  <span style={{ fontWeight: 800, color: '#4338ca' }}>₹{targetRent}/mo</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.45rem', fontWeight: 800, color: '#16a34a' }}>
                  <span>Total Contract Savings:</span>
                  <span>₹{(monthlySavings * Number(selectedTenure)).toLocaleString('en-IN')} Saved</span>
                </div>
              </div>

              {/* Extension Actions */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing || selectedTenure === currentTenure}
                  onClick={handleConfirmExtension}
                  style={{
                    flex: 2,
                    padding: '0.85rem 1.25rem',
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: (isProcessing || selectedTenure === currentTenure) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(67, 56, 202, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: selectedTenure === currentTenure ? 0.6 : 1
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Extending Lease...</span>
                    </>
                  ) : (
                    <>
                      <span>Lock {selectedTenure}-Month Rate (₹{targetRent}/mo)</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
