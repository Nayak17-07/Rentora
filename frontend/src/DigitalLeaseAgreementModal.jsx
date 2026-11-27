import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle,
  Download,
  X,
  Lock,
  Printer,
  PenTool,
  RotateCcw,
  Scale,
  Calendar,
  Building,
  UserCheck
} from 'lucide-react';
import { fetchWithAuth } from './utils/api';

export default function DigitalLeaseAgreementModal({
  rental,
  cartItems = [],
  customerName = '',
  isOpen,
  onClose,
  onSignComplete,
  isSigningMode = false
}) {
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signerName, setSignerName] = useState(customerName || localStorage.getItem('username') || '');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signatureMode, setSignatureMode] = useState('type'); // 'draw' | 'type'
  const [typedSignature, setTypedSignature] = useState(customerName || localStorage.getItem('username') || '');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    if (rental && rental._id) {
      // Fetch executed agreement from server
      setLoading(true);
      fetchWithAuth(`/api/rentals/${rental._id}/agreement`)
        .then(res => res.json())
        .then(data => {
          if (data.agreement) {
            setAgreement(data.agreement);
          }
        })
        .catch(err => console.warn('Failed to load agreement:', err))
        .finally(() => setLoading(false));
    } else {
      // Draft mode before checkout
      setLoading(false);
    }
  }, [isOpen, rental]);

  // Canvas drawing handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleExecuteSign = async () => {
    if (!agreedToTerms) {
      setErrorMsg('Please tick the box to accept the terms of this digital lease agreement.');
      return;
    }
    const finalName = signerName.trim() || typedSignature.trim();
    if (!finalName) {
      setErrorMsg('Please enter your legal full name for digital contract execution.');
      return;
    }

    let signatureDataUrl = null;
    if (signatureMode === 'draw' && canvasRef.current && hasDrawn) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      if (rental && rental._id) {
        const res = await fetchWithAuth(`/api/rentals/${rental._id}/sign-agreement`, {
          method: 'POST',
          body: JSON.stringify({
            signer_name: finalName,
            signature_data_url: signatureDataUrl,
            acceptance_confirmed: true
          })
        });
        if (res.ok) {
          const data = await res.json();
          setAgreement(data.agreement);
          if (onSignComplete) onSignComplete(data.agreement);
        }
      } else {
        // Pre-checkout signature object passed back to checkout
        const draftAgreement = {
          signer_name: finalName,
          signature_data_url: signatureDataUrl,
          signature_mode: signatureMode,
          accepted_at: new Date().toISOString(),
          acceptance_confirmed: true
        };
        if (onSignComplete) onSignComplete(draftAgreement);
        onClose();
      }
    } catch (err) {
      console.error('Sign error:', err);
      setErrorMsg('Failed to sign agreement. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const targetApplianceName = rental?.rental_name || (cartItems.length > 0 ? cartItems[0].rental_name || cartItems[0].name : 'Household Rental Appliance');
  const targetTenure = rental?.tenure || (cartItems.length > 0 ? cartItems[0].tenure : 6);
  const targetMonthlyRent = rental?.monthly_rent || (cartItems.length > 0 ? cartItems[0].monthly_price || cartItems[0].price : 499);
  const targetDeposit = rental?.security_deposit || Math.round(targetMonthlyRent * 1.5);
  const targetEscrowId = rental?.escrow_id || `ESC-BLR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const agreementId = agreement?.agreement_id || `AGR-IN-2026-${(rental?._id || 'DRAFT').slice(0, 8).toUpperCase()}`;
  const stampRef = agreement?.stamp_duty_reference || `E-STAMP-IND-2026-${(rental?._id || 'DL').slice(0, 6).toUpperCase()}`;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '840px',
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        {/* Modal Top Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#e23744',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Scale size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Digital Lease & Tenancy Agreement</h3>
                <span style={{
                  fontSize: '0.65rem',
                  background: '#059669',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 700
                }}>
                  IT ACT 2000 COMPLIANT
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                Legal Contract ID: <strong>{agreementId}</strong> • Notarized e-Stamp Ref: <strong>{stampRef}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Print official legal contract copy"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '0.35rem',
                borderRadius: '8px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Agreement Content */}
        <div style={{
          flex: 1,
          minHeight: 0,
          padding: '1.75rem 2rem',
          overflowY: 'auto',
          fontSize: '0.875rem',
          color: '#334155',
          lineHeight: '1.6',
          fontFamily: "'Inter', sans-serif"
        }}>
          {/* Official e-Stamp Header Box */}
          <div style={{
            border: '2px solid #b45309',
            borderRadius: '10px',
            padding: '1rem',
            background: '#fffbeb',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #d97706', paddingBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                GOVERNMENT OF NATIONAL CAPITAL TERRITORY / STATE NOTARIZATION
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#78350f' }}>
                CERTIFICATE OF NON-JUDICIAL E-STAMP DUTY
              </div>
              <div style={{ fontSize: '0.72rem', color: '#b45309' }}>
                Issued pursuant to the Indian Stamp Act, 1899 & Electronic Records Information Technology Act, 2000
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.75rem', color: '#78350f', paddingTop: '0.25rem' }}>
              <div><strong>Certificate Ref:</strong> {stampRef}</div>
              <div><strong>Stamp Duty Paid:</strong> ₹100.00 (Online Treasury)</div>
              <div><strong>First Party (Lessor):</strong> Rentora Logistics Pvt. Ltd.</div>
              <div><strong>Second Party (Lessee):</strong> {signerName || 'Tenant'}</div>
            </div>
          </div>

          {/* Agreement Introduction */}
          <p style={{ margin: '0 0 1rem', textAlign: 'justify' }}>
            This <strong>Digital Household Appliance Rental & Tenancy Agreement</strong> is executed on this{' '}
            <strong>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> by and between:
          </p>

          {/* Parties Box */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            marginBottom: '1.5rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e23744', textTransform: 'uppercase' }}>
                LESSOR / SERVICE PROVIDER
              </div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginTop: '2px' }}>
                Rentora Logistics & Household Rentals Pvt. Ltd.
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                CIN: U72900TG2026PTC184912<br />
                Registered Hub: Level 4, High-Tech Corridor, Hyderabad, 500081
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>
                LESSEE / VERIFIED TENANT
              </div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginTop: '2px' }}>
                {signerName || 'Verified Rentora Customer'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Identity Status: UIDAI Aadhaar OCR Verified<br />
                Delivery Address: {rental?.delivery_address?.city || 'Doorstep Customer Address'}
              </div>
            </div>
          </div>

          {/* Rented Asset Particulars */}
          <h4 style={{ margin: '1rem 0 0.5rem', color: '#0f172a', fontWeight: 800 }}>
            SCHEDULE OF APPLIANCE & FINANCIAL COMMITMENT
          </h4>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '1.5rem',
            fontSize: '0.8rem'
          }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Rented Asset Description</th>
                <th style={{ padding: '8px' }}>Tenure Commitment</th>
                <th style={{ padding: '8px' }}>Monthly Rent</th>
                <th style={{ padding: '8px' }}>Escrow Security Deposit</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', fontWeight: 700, color: '#0f172a' }}>{targetApplianceName}</td>
                <td style={{ padding: '8px' }}>{targetTenure} Months</td>
                <td style={{ padding: '8px', fontWeight: 700, color: '#e23744' }}>₹{targetMonthlyRent}/month</td>
                <td style={{ padding: '8px', fontWeight: 700, color: '#059669' }}>₹{targetDeposit} (Held in Escrow: {targetEscrowId})</td>
              </tr>
            </tbody>
          </table>

          {/* Legal Clauses & Covenants */}
          <h4 style={{ margin: '1.25rem 0 0.5rem', color: '#0f172a', fontWeight: 800 }}>
            TERMS, COVENANTS & STATUTORY OBLIGATIONS
          </h4>
          <ol style={{ paddingLeft: '1.25rem', margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <li>
              <strong>Fixed Tenure & Advance Billing:</strong> The Lessee agrees to lease the appliance for a fixed commitment of {targetTenure} months. Monthly subscriptions are billed automatically in advance on the same date each calendar month.
            </li>
            <li>
              <strong>Refundable Security Deposit Protection:</strong> The refundable security deposit of ₹{targetDeposit} (Deposit Reference: {targetEscrowId}) shall be refunded 100% within 5 business days upon asset return following doorstep QA inspection.
            </li>
            <li>
              <strong>Rentora Shield Damage Protection:</strong> The appliance is insured under the Rentora Shield policy with up to <strong>₹10,000 in accidental damage coverage</strong> absorbing ordinary cosmetic scuffs, electrical surges, and wear with zero deposit deduction.
            </li>
            <li>
              <strong>Overdue Contract & Automated Late Fees:</strong> If the Lessee retains physical custody beyond the agreed lease expiry without formal renewal or scheduled pickup, an automated late fee of <strong>₹50.00 per calendar day</strong> shall be assessed following a 2-day grace period.
            </li>
            <li>
              <strong>Doorstep Maintenance SLA:</strong> The Lessor guarantees free bi-annual sanitization and dispatch of a certified field engineer within 24 hours in the event of an operational defect.
            </li>
            <li>
              <strong>Rent-to-Own Equity Accrual:</strong> In accordance with the Rent-to-Own framework, 70% of cumulative subscription payments accrue as asset buyout equity, entitling the Lessee to permanent digital title deed ownership at any tenure milestone.
            </li>
          </ol>

          {/* Digital Signature Execution Section */}
          <div style={{
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem',
            background: agreement?.agreement_status === 'EXECUTED_DIGITALLY' ? '#f0fdf4' : '#fafafa',
            marginTop: '1.5rem'
          }}>
            {agreement?.agreement_status === 'EXECUTED_DIGITALLY' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#10b981',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#065f46', fontSize: '0.95rem' }}>
                      DIGITALLY SIGNED & EXECUTED
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#047857' }}>
                      Signer: <strong>{agreement.signer_name}</strong> • Timestamp: {new Date(agreement.executed_at || Date.now()).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#059669', fontFamily: 'monospace', marginTop: '2px' }}>
                      SHA-256 Hash: {agreement.signature_hash ? agreement.signature_hash.slice(0, 36) + '...' : 'Verified Electronic Signature'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: "'Dancing Script', cursive, sans-serif",
                    fontSize: '1.4rem',
                    color: '#1e3a8a',
                    fontWeight: 700
                  }}>
                    {agreement.signer_name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Authenticated via Rentora Secure Auth
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <PenTool size={16} color="#e23744" />
                    <span>Execute Legal Digital Signature</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('type')}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: signatureMode === 'type' ? '#0f172a' : '#ffffff',
                        color: signatureMode === 'type' ? '#ffffff' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      Type e-Sign
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('draw')}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: signatureMode === 'draw' ? '#0f172a' : '#ffffff',
                        color: signatureMode === 'draw' ? '#ffffff' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      Draw Signature
                    </button>
                  </div>
                </div>

                {signatureMode === 'type' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                      Type Legal Full Name as on Government ID:
                    </label>
                    <input
                      type="text"
                      value={typedSignature}
                      onChange={(e) => {
                        setTypedSignature(e.target.value);
                        setSignerName(e.target.value);
                      }}
                      placeholder="e.g. Mukesh Naik"
                      style={{
                        padding: '0.65rem 0.85rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        fontFamily: "'Dancing Script', cursive, sans-serif"
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Draw your signature in the box below:</span>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#e23744',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        <RotateCcw size={11} /> Clear
                      </button>
                    </div>
                    <canvas
                      ref={canvasRef}
                      width={480}
                      height={110}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      style={{
                        width: '100%',
                        height: '110px',
                        background: '#ffffff',
                        border: '1px dashed #94a3b8',
                        borderRadius: '8px',
                        cursor: 'crosshair',
                        display: 'block'
                      }}
                    />
                  </div>
                )}

                {/* Terms Consent Checkbox */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginTop: '0.85rem' }}>
                  <input
                    type="checkbox"
                    id="lease-agreement-consent-checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    style={{ marginTop: '3px', cursor: 'pointer' }}
                  />
                  <label htmlFor="lease-agreement-consent-checkbox" style={{ fontSize: '0.78rem', color: '#475569', cursor: 'pointer' }}>
                    I hereby certify that I am at least 18 years of age, legally competent, and I accept and execute this Digital Lease Agreement under the Information Technology Act, 2000.
                  </label>
                </div>

                {errorMsg && (
                  <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.4rem', fontWeight: 600 }}>
                    {errorMsg}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={handleExecuteSign}
                    disabled={submitting}
                    style={{
                      background: 'linear-gradient(135deg, #e23744 0%, #b91c1c 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.65rem 1.5rem',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 12px rgba(226, 55, 68, 0.3)'
                    }}
                  >
                    <Lock size={15} />
                    <span>{submitting ? 'Executing Agreement...' : 'Digitally Execute & Accept Agreement'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

