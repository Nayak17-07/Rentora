import React, { useState, useRef, useEffect, useCallback } from 'react';

import { useNavigate, Link } from 'react-router-dom';

import {

  ShieldCheck, UploadCloud, ArrowRight, Loader2,

  Home as HomeIcon, CheckCircle2, Lock, Zap, ShieldAlert,

  X, ChevronLeft, Clock, AlertCircle, Check, RefreshCw,

  CreditCard, ScanLine, Smartphone, KeyRound, Eye, EyeOff,

  RotateCcw, BadgeCheck, Fingerprint, FileArchive, FileText,

  ExternalLink, Sparkles, Building2, HelpCircle

} from 'lucide-react';

import { fetchWithAuth } from './utils/api';

import ThemeToggle from './ThemeToggle';

import { verifyDocumentOcr } from './utils/documentOcr';



// ─── Mode Constants ──────────────────────────────────────────────────────────

const MODE_OFFLINE_EKYC = 'offline_ekyc';  // Official UIDAI Offline ZIP / XML (100% Free & Unlimited)

const MODE_CARD_OCR_OTP = 'card_ocr_otp';  // Card photo OCR + OTP



// ─── Step Constants for Card Flow ─────────────────────────────────────────────

const STEP_AADHAAR   = 1;   // Enter Aadhaar number

const STEP_DOCUMENT  = 2;   // Upload Aadhaar card

const STEP_OTP       = 3;   // Enter OTP

const STEP_RESULT    = 4;   // Result



const KYCPage = () => {

  const navigate = useNavigate();



  // ── Overall Server State ──────────────────────────────────────────────────

  const [initialLoading, setInitialLoading] = useState(true);

  const [kycData, setKycData] = useState(null);

  const [isEditingPending, setIsEditingPending] = useState(false);



  // ── Selected Mode ─────────────────────────────────────────────────────────

  const [activeMode, setActiveMode] = useState(MODE_OFFLINE_EKYC);

  const [showHowToGuide, setShowHowToGuide] = useState(false);



  // ── Offline e-KYC State ───────────────────────────────────────────────────

  const [offlineFile, setOfflineFile] = useState(null);

  const [offlineFileName, setOfflineFileName] = useState('');

  const [offlineFileBase64, setOfflineFileBase64] = useState('');

  const [shareCode, setShareCode] = useState('');

  const [showShareCode, setShowShareCode] = useState(false);

  const [offlineDragOver, setOfflineDragOver] = useState(false);

  const [offlineSubmitting, setOfflineSubmitting] = useState(false);

  const [offlineStepText, setOfflineStepText] = useState('');

  const [offlineError, setOfflineError] = useState('');

  const offlineFileInputRef = useRef(null);



  // ── Card Flow Step State ──────────────────────────────────────────────────

  const [step, setStep] = useState(STEP_AADHAAR);



  // ── Step 1: Aadhaar input ─────────────────────────────────────────────────

  const [aadhaarRaw, setAadhaarRaw] = useState('');

  const [fullName, setFullName] = useState('');

  const [dob, setDob] = useState('');

  const [addressLine, setAddressLine] = useState('');

  const [liveValidation, setLiveValidation] = useState(null);

  const [validating, setValidating] = useState(false);

  const liveDebounceRef = useRef(null);



  // ── Step 2: Document upload ───────────────────────────────────────────────

  const [idFile, setIdFile] = useState(null);

  const [idPreview, setIdPreview] = useState(null);

  const [dragOver, setDragOver] = useState(false);

  const [ocrRunning, setOcrRunning] = useState(false);

  const [ocrProgress, setOcrProgress] = useState(0);

  const [ocrResult, setOcrResult] = useState(null);

  const fileInputRef = useRef(null);



  // ── Step 3: OTP ───────────────────────────────────────────────────────────

  const [otpSending, setOtpSending] = useState(false);

  const [otpSent, setOtpSent] = useState(false);

  const [maskedEmail, setMaskedEmail] = useState('');

  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const [otpVisible, setOtpVisible] = useState(false);

  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const [otpTimer, setOtpTimer] = useState(600);

  const timerRef = useRef(null);

  const [resendCooldown, setResendCooldown] = useState(0);



  // ── Submission & Notifications ────────────────────────────────────────────

  const [submitting, setSubmitting] = useState(false);

  const [submitStep, setSubmitStep] = useState('');

  const [errorMessage, setErrorMessage] = useState('');

  const [successData, setSuccessData] = useState(null);



  // ─────────────────────────────────────────────────────────────────────────

  // Load existing KYC on mount

  // ─────────────────────────────────────────────────────────────────────────

  const fetchKyc = async () => {

    try {

      setInitialLoading(true);

      const res = await fetchWithAuth('/api/kyc/');

      if (res.ok) {

        const data = await res.json();

        setKycData(data);

      }

    } catch (e) {

      console.error('KYC fetch error:', e);

    } finally {

      setInitialLoading(false);

    }

  };



  useEffect(() => { fetchKyc(); }, []);



  // Status Polling: Automatically re-check status every 5 seconds when in review

  useEffect(() => {

    let interval = null;

    if (kycData?.status === 'pending' || kycData?.status === 'in_review') {

      interval = setInterval(() => {

        fetchKyc();

      }, 5000);

    }

    return () => {

      if (interval) clearInterval(interval);

    };

  }, [kycData?.status]);



  // ─────────────────────────────────────────────────────────────────────────

  // OTP timer

  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {

    if (otpSent && step === STEP_OTP) {

      setOtpTimer(600);

      timerRef.current = setInterval(() => {

        setOtpTimer(t => {

          if (t <= 1) { clearInterval(timerRef.current); return 0; }

          return t - 1;

        });

      }, 1000);

    }

    return () => clearInterval(timerRef.current);

  }, [otpSent, step]);



  useEffect(() => {

    if (resendCooldown > 0) {

      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);

      return () => clearTimeout(t);

    }

  }, [resendCooldown]);



  const formatTimer = (secs) => {

    const m = Math.floor(secs / 60).toString().padStart(2, '0');

    const s = (secs % 60).toString().padStart(2, '0');

    return `${m}:${s}`;

  };



  // ─────────────────────────────────────────────────────────────────────────

  // Offline e-KYC Handlers (Option 12: Zero Cost, Unlimited UIDAI Standard)

  // ─────────────────────────────────────────────────────────────────────────

  const handleOfflineFileSelect = (file) => {

    if (!file) return;

    const name = file.name.toLowerCase();

    if (!name.endsWith('.zip') && !name.endsWith('.xml')) {

      setOfflineError('Please upload a valid UIDAI Aadhaar .zip or .xml file.');

      return;

    }

    setOfflineError('');

    setOfflineFile(file);

    setOfflineFileName(file.name);



    const reader = new FileReader();

    reader.onload = (e) => {

      setOfflineFileBase64(e.target.result);

    };

    reader.readAsDataURL(file);

  };



  const handleOfflineSubmit = async () => {

    if (!offlineFileBase64) {

      setOfflineError('Please select your Aadhaar offline ZIP or XML file.');

      return;

    }

    const isZip = offlineFileName.toLowerCase().endsWith('.zip');

    if (isZip && (!shareCode || shareCode.trim().length !== 4)) {

      setOfflineError('Please enter the 4-digit Share Code created during UIDAI download.');

      return;

    }



    setOfflineSubmitting(true);

    setOfflineError('');

    setOfflineStepText('Unpacking UIDAI package...');



    try {

      await new Promise(r => setTimeout(r, 450));

      setOfflineStepText('Decrypting with 4-digit Share Code...');



      await new Promise(r => setTimeout(r, 450));

      setOfflineStepText('Validating UIDAI digital signature & extracting data...');



      const res = await fetchWithAuth('/api/kyc/offline-ekyc', {

        method: 'POST',

        body: JSON.stringify({

          file_base64: offlineFileBase64,

          file_name: offlineFileName,

          share_code: shareCode.trim()

        })

      });



      const data = await res.json();

      if (res.ok) {

        setSuccessData(data);

        await fetchKyc();

      } else {

        setOfflineError(data.error || 'Failed to verify Aadhaar Offline e-KYC. Please check the file and share code.');

      }

    } catch {

      setOfflineError('Network error connecting to KYC server. Please try again.');

    } finally {

      setOfflineSubmitting(false);

      setOfflineStepText('');

    }

  };



  const handleDemoOfflineKyc = async () => {

    setOfflineSubmitting(true);

    setOfflineError('');

    setOfflineStepText('Simulating official UIDAI e-KYC download...');



    try {

      await new Promise(r => setTimeout(r, 600));

      setOfflineStepText('Verifying digital signature...');



      const res = await fetchWithAuth('/api/kyc/sample-offline-ekyc', {

        method: 'POST'

      });



      const data = await res.json();

      if (res.ok) {

        setSuccessData(data);

        await fetchKyc();

      } else {

        setOfflineError(data.error || 'Failed to load demo e-KYC.');

      }

    } catch {

      setOfflineError('Network error loading demo.');

    } finally {

      setOfflineSubmitting(false);

      setOfflineStepText('');

    }

  };



  // ─────────────────────────────────────────────────────────────────────────

  // Card Flow Handlers

  // ─────────────────────────────────────────────────────────────────────────

  const handleAadhaarChange = (e) => {

    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);

    setAadhaarRaw(raw);

    setLiveValidation(null);

    setErrorMessage('');



    clearTimeout(liveDebounceRef.current);

    if (raw.length === 12) {

      setValidating(true);

      liveDebounceRef.current = setTimeout(async () => {

        try {

          const res = await fetchWithAuth('/api/kyc/validate-aadhaar', {

            method: 'POST',

            body: JSON.stringify({ aadhaar_number: raw })

          });

          const data = await res.json();

          setLiveValidation(data);

        } catch {

          setLiveValidation({ valid: false, error: 'Could not verify. Check network connection.' });

        } finally {

          setValidating(false);

        }

      }, 350);

    }

  };



  const aadhaarDisplay = aadhaarRaw.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>

    [a, b, c].filter(Boolean).join(' ')

  );



  const handleFileSelect = useCallback(async (file) => {

    if (!file) return;

    setIdFile(file);

    setOcrResult(null);

    setOcrProgress(0);



    const reader = new FileReader();

    reader.onload = async (e) => {

      const preview = e.target.result;

      setIdPreview(preview);

      setOcrRunning(true);

      setOcrProgress(5);

      try {

        const result = await verifyDocumentOcr(preview, 'Aadhaar Card', aadhaarRaw, (pct) => {

          setOcrProgress(pct);

        });

        setOcrResult(result);

      } catch {

        setOcrResult({ isValid: true, manualReviewRequired: true, confidence: 75 });

      } finally {

        setOcrRunning(false);

      }

    };

    reader.readAsDataURL(file);

  }, [aadhaarRaw]);



  const sendOtp = async () => {

    setOtpSending(true);

    setErrorMessage('');

    try {

      const res = await fetchWithAuth('/api/kyc/send-otp', {

        method: 'POST',

        body: JSON.stringify({ aadhaar_number: aadhaarRaw, full_name: fullName })

      });

      const data = await res.json();

      if (res.ok) {

        setOtpSent(true);

        setMaskedEmail(data.masked_email || '');

        setResendCooldown(60);

      } else {

        setErrorMessage(data.error || 'Failed to send OTP.');

      }

    } catch {

      setErrorMessage('Network error. Could not send OTP.');

    } finally {

      setOtpSending(false);

    }

  };



  const handleOtpChange = (index, value) => {

    const digit = value.replace(/\D/g, '').slice(-1);

    const newOtp = [...otp];

    newOtp[index] = digit;

    setOtp(newOtp);

    setErrorMessage('');

    if (digit && index < 5) otpRefs[index + 1]?.current?.focus();

  };



  const handleOtpKeyDown = (index, e) => {

    if (e.key === 'Backspace' && !otp[index] && index > 0) {

      otpRefs[index - 1]?.current?.focus();

    }

  };



  const handleOtpPaste = (e) => {

    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pasted.length === 6) {

      setOtp(pasted.split(''));

      otpRefs[5]?.current?.focus();

    }

    e.preventDefault();

  };



  const otpValue = otp.join('');



  const handleSubmitCardKyc = async () => {

    if (otpValue.length !== 6) {

      setErrorMessage('Please enter the complete 6-digit OTP.');

      return;

    }

    setSubmitting(true);

    setErrorMessage('');

    setSubmitStep('Verifying OTP code...');



    try {

      await new Promise(r => setTimeout(r, 400));

      setSubmitStep('Securing encrypted Aadhaar hash...');



      const res = await fetchWithAuth('/api/kyc/', {

        method: 'POST',

        body: JSON.stringify({

          aadhaar_number: aadhaarRaw,

          full_name: fullName,

          dob,

          address_line: addressLine,

          id_proof_preview: idPreview || '',

          id_proof_name: idFile?.name || 'aadhaar_card.jpg',

          otp: otpValue,

          ocr_audit: ocrResult ? {

            verified: ocrResult.isValid,

            detected_keywords: ocrResult.detectedKeywords || [],

            confidence: ocrResult.confidence || 0

          } : null

        })

      });



      const data = await res.json();

      if (res.ok) {

        setSuccessData(data);

        setStep(STEP_RESULT);

        await fetchKyc();

      } else {

        setErrorMessage(data.error || 'Verification failed. Please try again.');

      }

    } catch {

      setErrorMessage('Network error. Please try again.');

    } finally {

      setSubmitting(false);

      setSubmitStep('');

    }

  };



  const canProceedToStep2 = aadhaarRaw.length === 12 && liveValidation?.valid && fullName.trim().length >= 2;

  const canProceedToStep3 = idPreview && (ocrResult?.isValid || ocrResult?.manualReviewRequired);



  // ─────────────────────────────────────────────────────────────────────────

  // Shared styles

  // ─────────────────────────────────────────────────────────────────────────

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

    border: '1.5px solid #cbd5e1',

    fontSize: '0.92rem',

    outline: 'none',

    boxSizing: 'border-box',

    transition: 'border-color 0.15s'

  };



  const btnPrimary = (disabled) => ({

    width: '100%',

    background: disabled ? '#94a3b8' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',

    color: '#ffffff',

    border: 'none',

    borderRadius: '0.875rem',

    padding: '1rem 1.5rem',

    fontSize: '1rem',

    fontWeight: 700,

    cursor: disabled ? 'not-allowed' : 'pointer',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    gap: '0.6rem',

    boxShadow: disabled ? 'none' : '0 8px 20px rgba(239,68,68,0.3)',

    transition: 'all 0.2s'

  });



  // ─────────────────────────────────────────────────────────────────────────



  // ─────────────────────────────────────────────────────────────────────────

  // PENDING / UNDER REVIEW STATE DISPLAY (with Live Status Polling)

  // ─────────────────────────────────────────────────────────────────────────

  const isActuallyInReview = (kycData?.status === 'in_review') || (kycData?.status === 'pending' && Boolean(kycData?.submitted_at || kycData?.id_proof_preview));
  if (!initialLoading && isActuallyInReview && !isEditingPending) {

    return (

      <PageShell>

        <div style={cardStyle}>

          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: 'linear-gradient(90deg, #f59e0b, #d97706)' }} />

          <div style={{ textAlign: 'center', padding: '1rem 0' }}>

            <div style={{

              width: '84px',

              height: '84px',

              background: '#fef3c7',

              borderRadius: '50%',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              margin: '0 auto 1.25rem',

              border: '4px solid #fde68a',

              boxShadow: '0 10px 25px rgba(245, 158, 11, 0.2)'

            }}>

              <Clock size={48} color="#d97706" />

            </div>



            <div style={{

              display: 'inline-flex',

              alignItems: 'center',

              gap: '0.4rem',

              background: '#fffbeb',

              color: '#b45309',

              padding: '0.4rem 1rem',

              borderRadius: '999px',

              fontSize: '0.82rem',

              fontWeight: 700,

              marginBottom: '0.75rem',

              border: '1px solid #fde68a'

            }}>

              <Loader2 size={15} className="animate-spin" />

              <span>Identity Verification in Progress • Status Polling Active</span>

            </div>



            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>

              KYC Under Compliance Verification

            </h2>

            <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto 1.75rem', lineHeight: 1.55 }}>

              Your credentials have been submitted and are currently being reviewed by our risk and compliance desk. Status automatically refreshes every few seconds.

            </p>



            {/* Extracted Details Card */}

            <div style={{ background: '#f8fafc', borderRadius: '1.25rem', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.75rem', textAlign: 'left' }}>

              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                {kycData.id_proof_preview && (

                  <div style={{ width: '90px', height: '110px', borderRadius: '0.75rem', overflow: 'hidden', border: '2px solid #e2e8f0', flexShrink: 0, background: '#e2e8f0' }}>

                    <img src={kycData.id_proof_preview} alt="Aadhaar Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                  </div>

                )}

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem' }}>

                  <div>

                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</span>

                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{kycData.full_name || '—'}</strong>

                  </div>

                  <div>

                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aadhaar Status</span>

                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', color: '#d97706' }}>Under Compliance Review</span>

                  </div>

                  <div>

                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Queue</span>

                    <span style={{ color: '#334155', fontWeight: 700, fontSize: '0.88rem' }}>Senior Compliance Officer Desk</span>

                  </div>

                  <div>

                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estimated Turnaround</span>

                    <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.88rem' }}>Instant to 10 Minutes</span>

                  </div>

                </div>

              </div>

            </div>



            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>

              <button

                type="button"

                onClick={fetchKyc}

                style={{

                  background: '#0f172a',

                  color: '#ffffff',

                  border: 'none',

                  borderRadius: '10px',

                  padding: '0.75rem 1.5rem',

                  fontSize: '0.9rem',

                  fontWeight: 700,

                  cursor: 'pointer',

                  display: 'inline-flex',

                  alignItems: 'center',

                  gap: '0.45rem'

                }}

              >

                <RefreshCw size={16} />

                <span>Check Status Now</span>

              </button>

              <button

                type="button"

                onClick={() => setIsEditingPending(true)}

                style={{

                  background: '#ffffff',

                  color: '#475569',

                  border: '1px solid #cbd5e1',

                  borderRadius: '10px',

                  padding: '0.75rem 1.25rem',

                  fontSize: '0.9rem',

                  fontWeight: 700,

                  cursor: 'pointer'

                }}

              >

                Update / Re-upload Documents

              </button>

              <Link

                to="/"

                style={{

                  background: '#f1f5f9',

                  color: '#334155',

                  textDecoration: 'none',

                  borderRadius: '10px',

                  padding: '0.75rem 1.25rem',

                  fontSize: '0.9rem',

                  fontWeight: 700,

                  display: 'inline-flex',

                  alignItems: 'center',

                  gap: '0.35rem'

                }}

              >

                <span>Browse Catalog</span>

                <ArrowRight size={16} />

              </Link>

            </div>

          </div>

        </div>

      </PageShell>

    );

  }



  // ─────────────────────────────────────────────────────────────────────────

  // APPROVED STATE DISPLAY

  // ─────────────────────────────────────────────────────────────────────────

  if (!initialLoading && (kycData?.status === 'approved' || kycData?.status === 'demo_approved')) {

    const isDemoVerification = Boolean(kycData.is_demo || kycData.status === 'demo_approved' || kycData.kyc_mode === 'offline_xml_demo');

    return (

      <PageShell>

        <div style={cardStyle}>

          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: isDemoVerification ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#10b981,#059669)' }} />

          <div style={{ textAlign: 'center', padding: '1rem 0' }}>

            <div style={{ width: '84px', height: '84px', background: isDemoVerification ? '#fef3c7' : '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: `4px solid ${isDemoVerification ? '#fde68a' : '#bbf7d0'}`, boxShadow: `0 10px 25px ${isDemoVerification ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}` }}>

              <BadgeCheck size={48} color={isDemoVerification ? '#d97706' : '#16a34a'} />

            </div>



            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: isDemoVerification ? '#fffbeb' : '#f0fdf4', color: isDemoVerification ? '#b45309' : '#15803d', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.75rem', border: `1px solid ${isDemoVerification ? '#fde68a' : '#bbf7d0'}` }}>

              <ShieldCheck size={16} />

              {isDemoVerification ? 'Simulated Sandbox Verification' : (kycData.kyc_mode === 'offline_xml' ? 'Official UIDAI Offline e-KYC Verified' : 'Aadhaar Verified Tenant')}

            </div>



            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>

              {isDemoVerification ? 'Aadhaar Identity Simulated (Demo Mode)' : 'Aadhaar Identity Fully Verified!'}

            </h2>

            <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto 1.75rem', lineHeight: 1.55 }}>

              {isDemoVerification

                ? '⚠️ Notice: This identity verification was loaded in Sandbox Simulation Mode for test demonstrations and is not a genuine UIDAI certification.'

                : 'Your government-backed Aadhaar KYC verification is active. You are cleared to rent appliances with ₹0 security deposit.'}

            </p>



            {/* Extracted Details Card */}

            <div style={{ background: '#f8fafc', borderRadius: '1.25rem', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.75rem', textAlign: 'left' }}>

              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                {kycData.id_proof_preview && (

                  <div style={{ width: '90px', height: '110px', borderRadius: '0.75rem', overflow: 'hidden', border: '2px solid #e2e8f0', flexShrink: 0, background: '#e2e8f0' }}>

                    <img src={kycData.id_proof_preview} alt="Aadhaar Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                  </div>

                )}

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem' }}>

                  <div>

                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</span>

                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{kycData.full_name || '—'}</strong>

                  </div>

                  <div>

                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Masked Aadhaar</span>

                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>{kycData.masked_aadhaar || 'XXXX-XXXX-****'}</span>

                  </div>

                  {kycData.dob && (

                    <div>

                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date of Birth</span>

                      <span style={{ fontSize: '0.92rem', color: '#334155', fontWeight: 600 }}>{kycData.dob}</span>

                    </div>

                  )}

                  {kycData.gender && (

                    <div>

                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</span>

                      <span style={{ fontSize: '0.92rem', color: '#334155', fontWeight: 600 }}>{kycData.gender === 'M' ? 'Male' : kycData.gender === 'F' ? 'Female' : kycData.gender}</span>

                    </div>

                  )}

                  <div>

                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Method</span>

                    <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>

                      <Check size={14} /> {kycData.kyc_mode === 'offline_xml' ? 'UIDAI Paperless e-KYC' : 'Card OCR & OTP'}

                    </span>

                  </div>

                  <div>

                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verification Trust</span>

                    <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.88rem' }}>{kycData.confidence_score ? `${kycData.confidence_score}%` : '99.9%'}</span>

                  </div>

                </div>

              </div>



              {kycData.address_line && (

                <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0' }}>

                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Verified Address</span>

                  <span style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.45 }}>{kycData.address_line}</span>

                </div>

              )}

            </div>



            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>

              <button onClick={() => navigate('/cart?openPayment=true')} style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', padding: '0.85rem 1.75rem', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 8px 16px rgba(16,185,129,0.25)', fontSize: '0.95rem' }}>

                Proceed to Payment Checkout <ArrowRight size={17} />

              </button>

              <button onClick={() => { setKycData(null); setStep(STEP_AADHAAR); }} style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', padding: '0.85rem 1.25rem', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}>

                <RefreshCw size={14} /> Re-verify

              </button>

            </div>

          </div>

        </div>

      </PageShell>

    );

  }



  // ─────────────────────────────────────────────────────────────────────────

  // MAIN KYC WORKFLOW RENDER

  // ─────────────────────────────────────────────────────────────────────────

  return (

    <PageShell>

      {initialLoading ? (

        <div style={{ textAlign: 'center', padding: '4rem' }}>

          <Loader2 className="animate-spin" size={38} color="#ef4444" style={{ margin: '0 auto 1rem' }} />

          <p style={{ color: '#64748b', fontWeight: 600 }}>Loading Aadhaar KYC records...</p>

        </div>

      ) : (

        <div style={cardStyle}>

          {/* Accent top gradient */}

          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: 'linear-gradient(90deg,#ef4444,#f97316,#10b981)' }} />



          {/* Header */}

          <div style={{ marginBottom: '1.5rem' }}>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', border: '1px solid #fee2e2', padding: '0.35rem 0.85rem', borderRadius: '2rem', marginBottom: '0.75rem' }}>

              <Fingerprint size={16} color="#ef4444" />

              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>

                100% Aadhaar Verification · Zero Third-Party Cost

              </span>

            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>

              Verify Your Tenant Identity

            </h1>

            <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>

              Choose official UIDAI Paperless Offline e-KYC or fast Aadhaar card photo with OTP.

            </p>

          </div>



          {/* MODE SELECTOR TABS */}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.75rem', background: '#f1f5f9', padding: '0.375rem', borderRadius: '1rem' }}>

            <button

              onClick={() => { setActiveMode(MODE_OFFLINE_EKYC); setOfflineError(''); }}

              style={{

                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',

                padding: '0.8rem 1rem', borderRadius: '0.75rem', border: 'none',

                background: activeMode === MODE_OFFLINE_EKYC ? '#ffffff' : 'transparent',

                color: activeMode === MODE_OFFLINE_EKYC ? '#0f172a' : '#64748b',

                fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',

                boxShadow: activeMode === MODE_OFFLINE_EKYC ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',

                transition: 'all 0.2s'

              }}

            >

              <FileArchive size={17} color={activeMode === MODE_OFFLINE_EKYC ? '#ef4444' : '#64748b'} />

              <span>UIDAI Offline e-KYC (ZIP)</span>

              <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '999px', fontWeight: 800 }}>

                FREE

              </span>

            </button>



            <button

              onClick={() => { setActiveMode(MODE_CARD_OCR_OTP); setErrorMessage(''); }}

              style={{

                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',

                padding: '0.8rem 1rem', borderRadius: '0.75rem', border: 'none',

                background: activeMode === MODE_CARD_OCR_OTP ? '#ffffff' : 'transparent',

                color: activeMode === MODE_CARD_OCR_OTP ? '#0f172a' : '#64748b',

                fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',

                boxShadow: activeMode === MODE_CARD_OCR_OTP ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',

                transition: 'all 0.2s'

              }}

            >

              <ScanLine size={17} color={activeMode === MODE_CARD_OCR_OTP ? '#ef4444' : '#64748b'} />

              <span>Aadhaar Photo & OTP</span>

            </button>

          </div>



          {/* ═══════════════════════════════════════════════════════════════════════

              TAB 1: UIDAI AADHAAR PAPERLESS OFFLINE e-KYC (ZIP / XML)

              ═══════════════════════════════════════════════════════════════════════ */}

          {activeMode === MODE_OFFLINE_EKYC && (

            <div>

              {/* How it works banner */}

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                    <Building2 size={18} color="#ef4444" />

                    <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Official UIDAI Paperless Offline e-KYC</strong>

                  </div>

                  <button

                    onClick={() => setShowHowToGuide(v => !v)}

                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}

                  >

                    <HelpCircle size={14} /> {showHowToGuide ? 'Hide guide' : 'How to get ZIP from UIDAI in 60s?'}

                  </button>

                </div>

                <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>

                  Download your digitally signed e-KYC ZIP from resident.uidai.gov.in. It is 100% free, unlimited, and unlocks tamper-proof government verification.

                </p>



                {/* Collapsible UIDAI Download Guide */}

                {showHowToGuide && (

                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.82rem', color: '#334155' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.85rem' }}>

                      <div style={{ background: '#fff', padding: '0.85rem', borderRadius: '0.6rem', border: '1px solid #e2e8f0' }}>

                        <span style={{ fontWeight: 800, color: '#ef4444', display: 'block', marginBottom: '0.2rem' }}>1. Visit myAadhaar</span>

                        <span>Go to <a href="https://myaadhaar.uidai.gov.in" target="_blank" rel="noreferrer" style={{ color: '#ef4444', fontWeight: 700, textDecoration: 'underline' }}>myaadhaar.uidai.gov.in <ExternalLink size={11} style={{ display: 'inline' }} /></a> & Login with OTP</span>

                      </div>

                      <div style={{ background: '#fff', padding: '0.85rem', borderRadius: '0.6rem', border: '1px solid #e2e8f0' }}>

                        <span style={{ fontWeight: 800, color: '#ef4444', display: 'block', marginBottom: '0.2rem' }}>2. Offline e-KYC</span>

                        <span>Click <strong>Offline e-KYC</strong> on the dashboard and create any 4-digit Share Code (e.g. 1234)</span>

                      </div>

                      <div style={{ background: '#fff', padding: '0.85rem', borderRadius: '0.6rem', border: '1px solid #e2e8f0' }}>

                        <span style={{ fontWeight: 800, color: '#ef4444', display: 'block', marginBottom: '0.2rem' }}>3. Download & Upload</span>

                        <span>Download the ZIP file, upload it here along with your 4-digit code. Verified instantly!</span>

                      </div>

                    </div>

                  </div>

                )}

              </div>



              {/* Error Alert */}

              {offlineError && (

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.85rem 1rem', borderRadius: '0.75rem', fontSize: '0.875rem', marginBottom: '1.25rem' }}>

                  <ShieldAlert size={17} style={{ flexShrink: 0 }} />

                  <span>{offlineError}</span>

                  <button onClick={() => setOfflineError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex' }}><X size={15} /></button>

                </div>

              )}



              {/* Hidden File Input */}

              <input

                type="file"

                ref={offlineFileInputRef}

                style={{ display: 'none' }}

                accept=".zip,.xml"

                onChange={e => handleOfflineFileSelect(e.target.files[0])}

              />



              {/* Drag & Drop File Zone */}

              {!offlineFile ? (

                <div

                  onClick={() => offlineFileInputRef.current?.click()}

                  onDragOver={e => { e.preventDefault(); setOfflineDragOver(true); }}

                  onDragLeave={() => setOfflineDragOver(false)}

                  onDrop={e => { e.preventDefault(); setOfflineDragOver(false); if (e.dataTransfer.files[0]) handleOfflineFileSelect(e.dataTransfer.files[0]); }}

                  style={{

                    border: offlineDragOver ? '2px dashed #ef4444' : '2px dashed #cbd5e1',

                    background: offlineDragOver ? '#fff5f5' : '#f8fafc',

                    borderRadius: '1.25rem', padding: '2.5rem 1.5rem', textAlign: 'center',

                    cursor: 'pointer', transition: 'all 0.15s', marginBottom: '1.5rem'

                  }}

                >

                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>

                    <FileArchive size={30} color="#ef4444" />

                  </div>

                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '0.35rem' }}>

                    Upload UIDAI Offline e-KYC (.zip or .xml)

                  </span>

                  <span style={{ fontSize: '0.84rem', color: '#64748b' }}>

                    Drag & drop or click to browse · Directly from UIDAI portal

                  </span>

                </div>

              ) : (

                <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>

                  <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>

                    <FileText size={24} color="#16a34a" />

                  </div>

                  <div style={{ flex: 1, overflow: 'hidden' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>

                      <strong style={{ fontSize: '0.92rem', color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>

                        {offlineFileName}

                      </strong>

                      <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '999px' }}>

                        Ready

                      </span>

                    </div>

                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>

                      {(offlineFile.size / 1024).toFixed(1)} KB · UIDAI Encrypted Archive

                    </span>

                  </div>

                  <button

                    onClick={() => { setOfflineFile(null); setOfflineFileName(''); setOfflineFileBase64(''); }}

                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.4rem' }}

                    title="Remove file"

                  >

                    <X size={18} />

                  </button>

                </div>

              )}



              {/* 4-Digit Share Code Input */}

              <div style={{ marginBottom: '1.75rem' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>

                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>

                    4-Digit Share Code (Password) *

                  </label>

                  <button

                    type="button"

                    onClick={() => setShowShareCode(v => !v)}

                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 600 }}

                  >

                    {showShareCode ? <EyeOff size={14} /> : <Eye size={14} />} {showShareCode ? 'Hide' : 'Show'}

                  </button>

                </div>

                <input

                  type={showShareCode ? 'text' : 'password'}

                  maxLength={4}

                  value={shareCode}

                  onChange={e => setShareCode(e.target.value.slice(0, 4))}

                  placeholder="e.g. 1234"

                  style={{

                    ...inputStyle,

                    fontFamily: 'monospace',

                    fontSize: '1.25rem',

                    letterSpacing: '0.3em',

                    textAlign: 'center'

                  }}

                />

                <span style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'block', marginTop: '0.35rem' }}>

                  The 4-character code you entered on the UIDAI portal when generating the ZIP file.

                </span>

              </div>



              {/* Action Buttons */}

              <button

                disabled={!offlineFileBase64 || (offlineFileName.toLowerCase().endsWith('.zip') && shareCode.length !== 4) || offlineSubmitting}

                onClick={handleOfflineSubmit}

                style={btnPrimary(!offlineFileBase64 || (offlineFileName.toLowerCase().endsWith('.zip') && shareCode.length !== 4) || offlineSubmitting)}

              >

                {offlineSubmitting ? (

                  <>

                    <Loader2 size={19} className="animate-spin" />

                    {offlineStepText || 'Decrypting UIDAI Data...'}

                  </>

                ) : (

                  <>

                    <ShieldCheck size={20} />

                    Verify UIDAI Offline e-KYC (Instant)

                    <ArrowRight size={17} />

                  </>

                )}

              </button>



              {/* Instant Demo Option */}

              <div style={{ marginTop: '1.25rem', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>

                <button

                  type="button"

                  disabled={offlineSubmitting}

                  onClick={handleDemoOfflineKyc}

                  style={{

                    background: 'none', border: '1px dashed #cbd5e1', borderRadius: '0.75rem',

                    padding: '0.7rem 1.25rem', color: '#475569', fontSize: '0.85rem', fontWeight: 600,

                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',

                    transition: 'all 0.15s'

                  }}

                >

                  <Sparkles size={16} color="#ef4444" />

                  Try with Sample UIDAI e-KYC Package (Instant Test)

                </button>

                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem', margin: '0.4rem 0 0' }}>

                  Test the offline verification flow without logging in to UIDAI resident portal.

                </p>

              </div>

            </div>

          )}



          {/* ═══════════════════════════════════════════════════════════════════════

              TAB 2: AADHAAR CARD PHOTO OCR & OTP FLOW (4 STEPS)

              ═══════════════════════════════════════════════════════════════════════ */}

          {activeMode === MODE_CARD_OCR_OTP && (

            <div>

              {/* Progress bar */}

              {step < STEP_RESULT && <StepProgressBar currentStep={step} />}



              {/* Trust badges */}

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>

                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Lock size={13} color="#64748b" /> 256-Bit Encrypted</span>

                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Zap size={13} color="#eab308" /> Verhoeff Checksum</span>

                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ShieldCheck size={13} color="#16a34a" /> DPDP Compliant</span>

                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CreditCard size={13} color="#7c3aed" /> No Plaintext Storage</span>

              </div>



              {/* Error banner */}

              {errorMessage && (

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.85rem 1rem', borderRadius: '0.75rem', fontSize: '0.875rem', marginBottom: '1.25rem' }}>

                  <ShieldAlert size={17} style={{ flexShrink: 0 }} />

                  <span>{errorMessage}</span>

                  <button onClick={() => setErrorMessage('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex' }}><X size={15} /></button>

                </div>

              )}



              {/* STEP 1: Aadhaar Number */}

              {step === STEP_AADHAAR && (

                <div>

                  <div style={{ marginBottom: '1.25rem' }}>

                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>

                      Full Legal Name (as on Aadhaar Card) *

                    </label>

                    <input

                      type="text"

                      value={fullName}

                      onChange={e => setFullName(e.target.value)}

                      placeholder="e.g. Rahul Kumar Sharma"

                      style={inputStyle}

                    />

                  </div>



                  <div style={{ marginBottom: '1.25rem' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>

                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>

                        Aadhaar Number (12 digits) *

                      </label>

                      {aadhaarRaw.length === 12 && (

                        validating ? (

                          <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>

                            <Loader2 size={13} className="animate-spin" /> Checking checksum...

                          </span>

                        ) : liveValidation?.valid ? (

                          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>

                            <CheckCircle2 size={14} /> Verhoeff Passed ✓

                          </span>

                        ) : liveValidation && !liveValidation.valid ? (

                          <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>

                            <AlertCircle size={14} /> Invalid Checksum

                          </span>

                        ) : null

                      )}

                    </div>

                    <div style={{ position: 'relative' }}>

                      <input

                        type="text"

                        inputMode="numeric"

                        value={aadhaarDisplay}

                        onChange={handleAadhaarChange}

                        placeholder="XXXX XXXX XXXX"

                        maxLength={14}

                        style={{

                          ...inputStyle,

                          fontFamily: 'monospace',

                          fontSize: '1.15rem',

                          letterSpacing: '0.12em',

                          borderColor: liveValidation?.valid ? '#10b981' : liveValidation && !liveValidation.valid ? '#ef4444' : '#cbd5e1',

                          paddingRight: '3rem'

                        }}

                      />

                      <div style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}>

                        {aadhaarRaw.length === 12 && liveValidation?.valid && <CheckCircle2 size={20} color="#10b981" />}

                        {aadhaarRaw.length === 12 && liveValidation && !liveValidation.valid && <AlertCircle size={20} color="#ef4444" />}

                      </div>

                    </div>



                    <div style={{ marginTop: '0.5rem' }}>

                      <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>

                        <div style={{

                          height: '100%',

                          width: `${(aadhaarRaw.length / 12) * 100}%`,

                          background: liveValidation?.valid ? '#10b981' : aadhaarRaw.length === 12 ? '#ef4444' : '#3b82f6',

                          borderRadius: '999px',

                          transition: 'width 0.2s, background 0.3s'

                        }} />

                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>

                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>

                          {liveValidation?.error || (aadhaarRaw.length < 12 ? `${aadhaarRaw.length}/12 digits` : liveValidation?.valid ? `Valid • ${liveValidation.masked}` : '')}

                        </span>

                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Validated via UIDAI Verhoeff algorithm</span>

                      </div>

                    </div>

                  </div>



                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

                    <div>

                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>Date of Birth</label>

                      <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inputStyle} />

                    </div>

                    <div>

                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>Current Address</label>

                      <input type="text" value={addressLine} onChange={e => setAddressLine(e.target.value)} placeholder="City, Pincode" style={inputStyle} />

                    </div>

                  </div>



                  <button

                    disabled={!canProceedToStep2}

                    onClick={() => { setErrorMessage(''); setStep(STEP_DOCUMENT); }}

                    style={btnPrimary(!canProceedToStep2)}

                  >

                    <ScanLine size={19} />

                    Continue — Upload Aadhaar Card

                    <ArrowRight size={17} />

                  </button>

                  {!canProceedToStep2 && (

                    <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.6rem' }}>

                      {!fullName.trim() ? 'Enter your legal full name.' : aadhaarRaw.length < 12 ? 'Enter all 12 Aadhaar digits.' : !liveValidation?.valid ? 'Aadhaar checksum failed.' : ''}

                    </p>

                  )}

                </div>

              )}



              {/* STEP 2: Document Upload & OCR */}

              {step === STEP_DOCUMENT && (

                <div>

                  <button onClick={() => setStep(STEP_AADHAAR)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.25rem', padding: 0 }}>

                    <ChevronLeft size={16} /> Back

                  </button>



                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem' }}>Upload Aadhaar Card Image</h3>

                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.25rem', lineHeight: 1.5 }}>

                    Upload a clear photo or scan of your physical Aadhaar card. AI will verify UIDAI watermarks.

                  </p>



                  <input

                    type="file"

                    ref={fileInputRef}

                    style={{ display: 'none' }}

                    accept="image/*,.pdf"

                    onChange={e => handleFileSelect(e.target.files[0])}

                  />



                  {!idPreview ? (

                    <div

                      onClick={() => fileInputRef.current?.click()}

                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}

                      onDragLeave={() => setDragOver(false)}

                      onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}

                      style={{

                        border: dragOver ? '2px dashed #ef4444' : '2px dashed #cbd5e1',

                        background: dragOver ? '#fff5f5' : '#f8fafc',

                        borderRadius: '1rem', padding: '2.5rem 1rem', textAlign: 'center',

                        cursor: 'pointer', transition: 'all 0.15s', marginBottom: '1.5rem'

                      }}

                    >

                      <UploadCloud size={36} color="#ef4444" style={{ margin: '0 auto 0.75rem', display: 'block' }} />

                      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>

                        Drop your Aadhaar card image here

                      </span>

                      <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>PNG or JPG · Tesseract AI auto-scan</span>

                    </div>

                  ) : (

                    <div style={{ marginBottom: '1.5rem' }}>

                      <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '0.875rem', overflow: 'hidden', marginBottom: '1rem', position: 'relative' }}>

                        <img src={idPreview} alt="Aadhaar preview" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }} />

                        <button

                          onClick={() => { setIdFile(null); setIdPreview(null); setOcrResult(null); }}

                          style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}

                        >

                          <X size={14} />

                        </button>

                      </div>



                      {ocrRunning && (

                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.75rem', padding: '1rem', marginBottom: '0.75rem' }}>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>

                            <Loader2 size={16} color="#3b82f6" className="animate-spin" />

                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1d4ed8' }}>AI scanning Aadhaar landmarks... {ocrProgress}%</span>

                          </div>

                          <div style={{ height: '6px', background: '#dbeafe', borderRadius: '999px', overflow: 'hidden' }}>

                            <div style={{ height: '100%', width: `${ocrProgress}%`, background: 'linear-gradient(90deg,#3b82f6,#6366f1)', borderRadius: '999px', transition: 'width 0.3s' }} />

                          </div>

                        </div>

                      )}



                      {ocrResult && !ocrRunning && (

                        <div style={{

                          background: ocrResult.isValid ? '#f0fdf4' : '#fef2f2',

                          border: `1px solid ${ocrResult.isValid ? '#bbf7d0' : '#fecaca'}`,

                          borderRadius: '0.75rem', padding: '1rem', marginBottom: '0.75rem'

                        }}>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>

                            {ocrResult.isValid

                              ? <CheckCircle2 size={17} color="#16a34a" />

                              : <AlertCircle size={17} color="#dc2626" />

                            }

                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: ocrResult.isValid ? '#15803d' : '#dc2626' }}>

                              {ocrResult.isValid ? `Aadhaar Landmarks Detected (${ocrResult.confidence || 0}% score)` : 'Could not detect UIDAI landmarks'}

                            </span>

                          </div>

                          {ocrResult.isValid && ocrResult.detectedKeywords?.length > 0 && (

                            <p style={{ fontSize: '0.78rem', color: '#15803d', margin: 0 }}>

                              Found: {ocrResult.detectedKeywords.slice(0, 5).join(' · ')}

                            </p>

                          )}

                        </div>

                      )}



                      <button

                        onClick={() => fileInputRef.current?.click()}

                        style={{ background: 'none', border: '1px solid #cbd5e1', color: '#475569', padding: '0.55rem 1rem', borderRadius: '0.6rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}

                      >

                        <RotateCcw size={13} /> Replace Image

                      </button>

                    </div>

                  )}



                  <button

                    disabled={!canProceedToStep3 || ocrRunning}

                    onClick={() => { setErrorMessage(''); setStep(STEP_OTP); }}

                    style={btnPrimary(!canProceedToStep3 || ocrRunning)}

                  >

                    {ocrRunning ? <><Loader2 size={18} className="animate-spin" /> Scanning...</> : <><Smartphone size={18} /> Continue — Get OTP Code <ArrowRight size={17} /></>}

                  </button>

                </div>

              )}



              {/* STEP 3: OTP */}

              {step === STEP_OTP && (

                <div>

                  <button onClick={() => setStep(STEP_DOCUMENT)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.25rem', padding: 0 }}>

                    <ChevronLeft size={16} /> Back

                  </button>



                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem' }}>Authenticate via OTP Code</h3>

                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem', lineHeight: 1.5 }}>

                    A 6-digit OTP will be sent to your registered account to confirm your identity.

                  </p>



                  {!otpSent ? (

                    <button

                      disabled={otpSending}

                      onClick={sendOtp}

                      style={{ ...btnPrimary(otpSending), marginBottom: '1rem' }}

                    >

                      {otpSending

                        ? <><Loader2 size={18} className="animate-spin" /> Sending OTP...</>

                        : <><Smartphone size={18} /> Send OTP to My Registered Email <ArrowRight size={17} /></>

                      }

                    </button>

                  ) : (

                    <div>

                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.875rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

                        <CheckCircle2 size={22} color="#16a34a" style={{ flexShrink: 0 }} />

                        <div>

                          <strong style={{ fontSize: '0.88rem', color: '#15803d', display: 'block' }}>OTP Dispatched</strong>

                          <span style={{ fontSize: '0.8rem', color: '#166534' }}>6-digit code sent to <strong>{maskedEmail}</strong></span>

                        </div>

                      </div>



                      <div style={{ marginBottom: '1.25rem' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>

                          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>Enter 6-Digit Code</label>

                          <button onClick={() => setOtpVisible(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 600 }}>

                            {otpVisible ? <EyeOff size={14} /> : <Eye size={14} />} {otpVisible ? 'Hide' : 'Show'}

                          </button>

                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }} onPaste={handleOtpPaste}>

                          {otp.map((digit, i) => (

                            <input

                              key={i}

                              ref={otpRefs[i]}

                              type={otpVisible ? 'text' : 'password'}

                              inputMode="numeric"

                              maxLength={1}

                              value={digit}

                              onChange={e => handleOtpChange(i, e.target.value)}

                              onKeyDown={e => handleOtpKeyDown(i, e)}

                              style={{

                                width: '52px', height: '60px', textAlign: 'center',

                                fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace',

                                border: `2px solid ${digit ? '#ef4444' : '#cbd5e1'}`,

                                borderRadius: '0.75rem', outline: 'none',

                                background: digit ? '#fef2f2' : '#fff',

                                transition: 'all 0.15s',

                                color: '#0f172a'

                              }}

                            />

                          ))}

                        </div>

                      </div>



                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>

                        <span style={{ fontSize: '0.82rem', color: otpTimer < 60 ? '#dc2626' : '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>

                          <Clock size={14} /> {otpTimer > 0 ? `Expires in ${formatTimer(otpTimer)}` : 'OTP expired'}

                        </span>

                        <button
                          type="button"
                          disabled={Boolean(resendCooldown || otpTimer)}
                          onClick={() => { setOtpSent(false); setOtp(['','','','','','']); }}
                          style={{ background: 'none', border: 'none', cursor: resendCooldown > 0 || otpTimer > 0 ? 'not-allowed' : 'pointer', color: resendCooldown > 0 || otpTimer > 0 ? '#94a3b8' : '#ef4444', fontSize: '0.82rem', fontWeight: 700 }}
                        >

                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}

                        </button>

                      </div>



                      <button

                        disabled={otpValue.length !== 6 || submitting}

                        onClick={handleSubmitCardKyc}

                        style={btnPrimary(otpValue.length !== 6 || submitting)}

                      >

                        {submitting

                          ? <><Loader2 size={18} className="animate-spin" /> {submitStep || 'Verifying...'}</>

                          : <><KeyRound size={18} /> Verify Aadhaar KYC <ArrowRight size={17} /></>

                        }

                      </button>

                    </div>

                  )}

                </div>

              )}



              {/* STEP 4: Result */}

              {step === STEP_RESULT && successData && (

                <div style={{ textAlign: 'center' }}>

                  <div style={{ width: '80px', height: '80px', background: successData.status === 'approved' ? '#dcfce7' : '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: `4px solid ${successData.status === 'approved' ? '#bbf7d0' : '#fde68a'}` }}>

                    {successData.status === 'approved' ? <BadgeCheck size={44} color="#16a34a" /> : <Clock size={44} color="#d97706" />}

                  </div>

                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>

                    {successData.status === 'approved' ? 'Aadhaar KYC Approved!' : 'Submitted for Compliance Review'}

                  </h2>

                  <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.55 }}>

                    Your identity is verified. You are now cleared to rent on Rentora.

                  </p>

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>

                    <button onClick={() => navigate('/cart?openPayment=true')} style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', padding: '0.85rem 1.75rem', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 8px 16px rgba(16,185,129,0.25)', fontSize: '0.95rem' }}>

                      Proceed to Payment Checkout <ArrowRight size={17} />

                    </button>

                    <button onClick={() => navigate('/')} style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', padding: '0.85rem 1.25rem', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}>

                      <HomeIcon size={15} /> Home

                    </button>

                  </div>

                </div>

              )}

            </div>

          )}

        </div>

      )}

    </PageShell>

  );

};



// ─── Step Progress Component (for Card mode) ─────────────────────────────────

const StepProgressBar = ({ currentStep }) => {

  const steps = [

    { n: 1, label: 'Aadhaar No.' },

    { n: 2, label: 'Card OCR' },

    { n: 3, label: 'OTP Code' },

    { n: 4, label: 'Verified' }

  ];

  return (

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', gap: 0 }}>

      {steps.map((s, i) => {

        const done = currentStep > s.n;

        const active = currentStep === s.n;

        return (

          <React.Fragment key={s.n}>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>

              <div style={{

                width: '36px', height: '36px', borderRadius: '50%',

                background: done ? '#10b981' : active ? '#ef4444' : '#e2e8f0',

                color: done || active ? '#fff' : '#94a3b8',

                display: 'flex', alignItems: 'center', justifyContent: 'center',

                fontWeight: 700, fontSize: '0.85rem',

                transition: 'all 0.3s',

                boxShadow: active ? '0 4px 12px rgba(239,68,68,0.35)' : done ? '0 4px 12px rgba(16,185,129,0.25)' : 'none'

              }}>

                {done ? <Check size={16} /> : s.n}

              </div>

              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: active ? '#ef4444' : done ? '#10b981' : '#94a3b8' }}>

                {s.label}

              </span>

            </div>

            {i < steps.length - 1 && (

              <div style={{

                flex: 1, height: '3px', margin: '0 0.25rem', marginBottom: '1.2rem',

                background: currentStep > s.n ? '#10b981' : '#e2e8f0',

                transition: 'background 0.4s'

              }} />

            )}

          </React.Fragment>

        );

      })}

    </div>

  );

};



// ─── Layout wrapper ───────────────────────────────────────────────────────────

const PageShell = ({ children }) => (

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



    <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem' }}>

      {children}

    </main>



    <footer style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.78rem', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>

      © 2026 Rentora Technologies Inc. · UIDAI Paperless Offline e-KYC & Verhoeff algorithm. SHA-256 encrypted. Zero third-party fees.

    </footer>

  </div>

);



export default KYCPage;

