import { showToast } from './utils/toast';
import React, { useState, useEffect } from 'react';
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
  UserCheck,
  Navigation,
  Radio,
  Gauge,
  Compass,
  Zap,
  RefreshCw
} from 'lucide-react';
import { fetchWithAuth, publicFetch } from './utils/api';

const STAGES = [
  { key: 'ORDER_CONFIRMED', label: 'Order Confirmed', icon: CheckCircle2 },
  { key: 'KYC_VERIFIED', label: 'KYC Approved', icon: ShieldCheck },
  { key: 'QUALITY_CHECK', label: '28-Pt Sanitization', icon: Sparkles },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered & Installed', icon: CheckCircle2 }
];

const DeliveryTrackerModal = ({ isOpen, onClose, rental, onRentalUpdated }) => {
  const [activeView, setActiveView] = useState('stepper'); // 'live_map' | 'stepper'
  const [copied, setCopied] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleSlot, setRescheduleSlot] = useState(
    rental?.delivery_tracking?.slot || rental?.delivery_address?.delivery_slot || 'Morning Slot (10:00 AM – 01:00 PM)'
  );
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('Personal schedule change');
  const [reschedulingLoading, setReschedulingLoading] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState('');

  // Live GPS tracking state
  const [liveGps, setLiveGps] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSimProgress, setGpsSimProgress] = useState(0.68); // Progress along route (0 to 1)

  const rentalId = rental?.rental_id || rental?._id;

  const fetchLiveGps = async () => {
    if (!rentalId) return;
    try {
      setGpsLoading(true);
      const res = await publicFetch(`/api/tracking/live/${rentalId}`);
      if (res.ok) {
        const data = await res.json();
        setLiveGps(data);
      }
    } catch (err) {
      console.error('Error fetching live GPS:', err);
    } finally {
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && rentalId) {
      fetchLiveGps();
      // Periodically update simulated progress
      const interval = setInterval(() => {
        setGpsSimProgress(prev => (prev < 0.95 ? prev + 0.015 : 0.95));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, rentalId]);

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

  const distKm = liveGps?.distance_remaining_km || Number((14.8 * (1 - gpsSimProgress)).toFixed(1));
  const etaMins = liveGps?.eta_minutes || Math.max(4, Math.round(distKm * 3.5));

  // Compute animated vehicle coordinates on SVG map (width 600, height 260)
  const mapWidth = 600;
  const mapHeight = 240;
  const startX = 60;
  const startY = 190;
  const endX = 530;
  const endY = 55;

  // Curvature control point
  const ctrlX = 260;
  const ctrlY = 70;

  // Bezier curve point formula
  const t = Math.min(0.96, Math.max(0.04, gpsSimProgress));
  const vehX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ctrlX + t * t * endX;
  const vehY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * ctrlY + t * t * endY;

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

        {/* View Switcher Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '0 1.75rem'
        }}>
          <button
            type="button"
            onClick={() => setActiveView('live_map')}
            style={{
              padding: '0.85rem 1.25rem',
              border: 'none',
              background: 'none',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeView === 'live_map' ? '#0284c7' : '#64748b',
              borderBottom: activeView === 'live_map' ? '3px solid #0284c7' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Navigation size={16} />
            <span>Interactive Live GPS Map</span>
            <span style={{
              background: '#e0f2fe',
              color: '#0369a1',
              padding: '1px 6px',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 800
            }}>
              Active
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('stepper')}
            style={{
              padding: '0.85rem 1.25rem',
              border: 'none',
              background: 'none',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeView === 'stepper' ? '#0284c7' : '#64748b',
              borderBottom: activeView === 'stepper' ? '3px solid #0284c7' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <CheckCircle2 size={16} />
            <span>5-Stage Fulfillment Stepper</span>
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

          {/* VIEW 1: LIVE INTERACTIVE GPS ROUTE MAP */}
          {activeView === 'live_map' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Dynamic ETA & Speed Gauge Bar */}
              <div style={{
                background: '#0f172a',
                color: '#ffffff',
                borderRadius: '16px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(56, 189, 248, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Truck size={24} color="#38bdf8" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                      Live Arrival Countdown
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                      Arriving in ~{etaMins} mins
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Distance Left</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                      {distKm} km
                    </div>
                  </div>
                  <div style={{ borderLeft: '1px solid #334155', paddingLeft: '1.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Vehicle Speed</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ade80' }}>
                      28 km/h
                    </div>
                  </div>
                </div>
              </div>

              {/* Stylized Interactive Map Canvas */}
              <div style={{
                background: '#1e293b',
                borderRadius: '16px',
                border: '1px solid #334155',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)'
              }}>
                {/* Map Grid & Road Canvas */}
                <svg width="100%" height={mapHeight} viewBox={`0 0 ${mapWidth} ${mapHeight}`} style={{ display: 'block' }}>
                  <defs>
                    <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#4ade80" />
                    </linearGradient>
                    <radialGradient id="pulseGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                    </radialGradient>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    </pattern>
                  </defs>

                  {/* Grid background */}
                  <rect width={mapWidth} height={mapHeight} fill="#0f172a" />
                  <rect width={mapWidth} height={mapHeight} fill="url(#grid)" />

                  {/* Arterial Road Network (Map Simulation) */}
                  <path d="M 20 180 Q 250 160 580 180" stroke="#334155" strokeWidth="14" fill="none" />
                  <path d="M 20 180 Q 250 160 580 180" stroke="#1e293b" strokeWidth="10" fill="none" />
                  
                  <path d="M 320 20 L 300 230" stroke="#334155" strokeWidth="12" fill="none" />
                  <path d="M 320 20 L 300 230" stroke="#1e293b" strokeWidth="8" fill="none" />

                  {/* Active Delivery Route Polyline */}
                  <path
                    d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
                    stroke="rgba(56, 189, 248, 0.25)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <path
                    d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
                    stroke="url(#routeGradient)"
                    strokeWidth="4"
                    strokeDasharray="6 4"
                    fill="none"
                  />

                  {/* Origin Depot Node */}
                  <circle cx={startX} cy={startY} r="10" fill="#0284c7" />
                  <circle cx={startX} cy={startY} r="5" fill="#ffffff" />
                  <text x={startX - 15} y={startY + 26} fill="#94a3b8" fontSize="10" fontWeight="700">
                    Depot Hub
                  </text>

                  {/* Customer Destination Node */}
                  <circle cx={endX} cy={endY} r="10" fill="#e23744" />
                  <circle cx={endX} cy={endY} r="5" fill="#ffffff" />
                  <text x={endX - 35} y={endY - 14} fill="#f8fafc" fontSize="11" fontWeight="800">
                    Your Doorstep
                  </text>

                  {/* Animated Vehicle Node */}
                  <circle cx={vehX} cy={vehY} r="22" fill="url(#pulseGlow)" />
                  <circle cx={vehX} cy={vehY} r="12" fill="#38bdf8" />
                  <circle cx={vehX} cy={vehY} r="6" fill="#0f172a" />
                </svg>

                {/* Floating GPS HUD Overlay */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '14px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(6px)',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <Radio size={14} color="#4ade80" />
                  <span style={{ fontSize: '0.75rem', color: '#f8fafc', fontWeight: 600 }}>
                    Live GPS Signal: High Precision (±2m)
                  </span>
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '14px',
                  display: 'flex',
                  gap: '0.5rem'
                }}>
                  <button
                    type="button"
                    onClick={() => setGpsSimProgress(prev => (prev < 0.95 ? prev + 0.05 : 0.4))}
                    style={{
                      background: 'rgba(56, 189, 248, 0.9)',
                      color: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Navigation size={13} />
                    <span>Advance Vehicle Demo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: 5-STAGE FULFILLMENT STEPPER */}
          {activeView === 'stepper' && (
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
          )}

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
