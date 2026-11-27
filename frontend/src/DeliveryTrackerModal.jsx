import { showToast } from './utils/toast';
import React, { useState } from 'react';
import { 
  X, 
  Truck, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Calendar, 
  KeyRound, 
  Copy, 
  Check, 
  Sparkles, 
  UserCheck
} from 'lucide-react';
import { fetchWithAuth } from './utils/api';

const STAGES = [
  { key: 'ORDER_CONFIRMED', label: 'Order Confirmed', icon: CheckCircle2 },
  { key: 'KYC_VERIFIED', label: 'KYC Approved', icon: ShieldCheck },
  { key: 'QUALITY_CHECK', label: '28-Pt Sanitization', icon: Sparkles },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered & Installed', icon: CheckCircle2 }
];

const DeliveryTrackerModal = ({ isOpen, onClose, rental, onRentalUpdated }) => {
  const [copied, setCopied] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleSlot, setRescheduleSlot] = useState(
    rental?.delivery_tracking?.slot || rental?.delivery_address?.delivery_slot || 'Morning Slot (10:00 AM – 01:00 PM)'
  );
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('Personal schedule change');
  const [reschedulingLoading, setReschedulingLoading] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState('');

  const rentalId = rental?.rental_id || rental?._id;

  if (!isOpen || !rental) return null;

  const tracking = rental.delivery_tracking || {};
  const address = rental.delivery_address || {};
  const currentStage = tracking.current_stage || rental.delivery_status || 'OUT_FOR_DELIVERY';
  const otp = tracking.delivery_otp || '4829';

  const getStageIndex = (stageKey) => {
    const idx = STAGES.findIndex(s => s.key === stageKey);
    return idx >= 0 ? idx : 3;
  };

  const currentIdx = getStageIndex(currentStage);

  const handleCopyOtp = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(otp).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    setReschedulingLoading(true);
    try {
      const res = await fetchWithAuth(`/api/rentals/${rentalId}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({
          new_slot: rescheduleSlot,
          new_date: rescheduleDate,
          reason: rescheduleReason
        })
      });

      if (res.ok) {
        setRescheduleSuccess(`Delivery appointment successfully moved to ${rescheduleSlot}!`);
        setIsRescheduling(false);
        if (onRentalUpdated) {
          onRentalUpdated();
        }
        setTimeout(() => setRescheduleSuccess(''), 4000);
      } else {
        const err = await res.json();
        showToast.error(err.error || 'Failed to reschedule delivery', 'Reschedule Error');
      }
    } catch (err) {
      console.error('Error rescheduling:', err);
      showToast.error('Network error while rescheduling', 'Network Error');
    } finally {
      setReschedulingLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 1150,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '740px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        margin: 'auto'
      }}>
        {/* Header Bar */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{
                background: '#e23744',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Live Real-Time Fleet Tracking
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                #{tracking.tracking_id || `TRK-${rentalId?.slice(-6).toUpperCase()}`}
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              {rental.appliance?.rental_name || rental.rental_name || 'Appliance Delivery'}
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cbd5e1',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '1.5rem 1.75rem', maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
          
          {rescheduleSuccess && (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              color: '#065f46',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem'
            }}>
              <CheckCircle2 size={18} color="#059669" />
              <span>{rescheduleSuccess}</span>
            </div>
          )}

          {/* Secure Handover OTP Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1.5px solid #86efac',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            boxShadow: '0 4px 12px rgba(22, 101, 52, 0.08)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                <KeyRound size={15} />
                <span>Doorstep Handover OTP</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#15803d', maxWidth: '340px' }}>
                Share this secure code with your Rentora technician <strong>only after</strong> physical testing.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                background: '#ffffff',
                border: '2px dashed #16a34a',
                borderRadius: '10px',
                padding: '0.4rem 1rem',
                fontSize: '1.4rem',
                fontWeight: 900,
                color: '#15803d',
                letterSpacing: '0.2em',
                fontFamily: 'monospace'
              }}>
                {otp}
              </div>
              <button
                onClick={handleCopyOtp}
                title="Copy Handover OTP"
                style={{
                  background: '#ffffff',
                  border: '1px solid #86efac',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: copied ? '#16a34a' : '#475569',
                  cursor: 'pointer'
                }}
              >
                {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* 5-STAGE FULFILLMENT STEPPER */}
          <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '1rem', marginTop: '0.5rem' }}>
                <div style={{
                  position: 'absolute',
                  top: '18px',
                  left: '20px',
                  right: '20px',
                  height: '4px',
                  background: '#e2e8f0',
                  zIndex: 1
                }} />
                <div style={{
                  position: 'absolute',
                  top: '18px',
                  left: '20px',
                  width: `${(currentIdx / (STAGES.length - 1)) * 92}%`,
                  height: '4px',
                  background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                  zIndex: 2,
                  transition: 'width 0.4s ease'
                }} />

                {STAGES.map((s, index) => {
                  const IconComponent = s.icon;
                  const isPassed = index < currentIdx;
                  const isCurrent = index === currentIdx;

                  return (
                    <div key={s.key} style={{ zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '70px', textAlign: 'center' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isPassed ? '#10b981' : (isCurrent ? '#e23744' : '#f1f5f9'),
                        border: isCurrent ? '3px solid #fecdd3' : (isPassed ? '2px solid #059669' : '2px solid #cbd5e1'),
                        color: isPassed || isCurrent ? '#ffffff' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isCurrent ? '0 0 0 4px rgba(226, 55, 68, 0.2)' : 'none',
                        transition: 'all 0.2s ease',
                        marginBottom: '0.4rem'
                      }}>
                        <IconComponent size={17} />
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: isCurrent ? 800 : (isPassed ? 600 : 500),
                        color: isCurrent ? '#e23744' : (isPassed ? '#0f172a' : '#94a3b8'),
                        lineHeight: 1.2
                      }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          {/* Assigned Field Engineer Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.15rem 1.25rem',
            marginTop: '1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: '#eff6ff',
                border: '2px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1d4ed8'
              }}>
                <UserCheck size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  {tracking.courier_partner || 'Rentora Direct White-Glove Fleet'}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  {tracking.agent_name || 'Rajesh Patil (Senior Field Specialist)'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                  <span>Vehicle: <strong>{tracking.vehicle_number || 'KA-01-EL-9284'}</strong></span>
                  <span>•</span>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>Rating 4.92 ★</span>
                </div>
              </div>
            </div>

            <a
              href={`tel:${tracking.agent_phone || '+919845012891'}`}
              style={{
                textDecoration: 'none',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                color: '#1e293b',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Phone size={14} color="#16a34a" />
              <span>Call Technician</span>
            </a>
          </div>

          {/* Destination Details */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem'
          }}>
            <MapPin size={18} color="#e23744" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                Delivery Destination: {address.recipient_name || 'Customer Residence'}
              </strong>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                {address.house_flat && `${address.house_flat}, `}
                {address.street_area && `${address.street_area}, `}
                {address.city || 'Bangalore'} - {address.pincode || '560034'}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DeliveryTrackerModal;
