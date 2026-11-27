import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Zap, Truck, Check, RefreshCw, Award, Sparkles, HelpCircle, Star } from 'lucide-react';
import { trackApplianceView } from './utils/browsingHistory';
import { publicFetch } from './utils/api';

function ProductDetailsModal({ appliance, onClose, onAddToCart }) {
  const [mode, setMode] = useState('rent'); // 'rent' | 'buy_refurbished'
  const [tenure, setTenure] = useState('3');
  const [isAdding, setIsAdding] = useState(false);
  const [pincode, setPincode] = useState('500081');
  const [pincodeVerified, setPincodeVerified] = useState(true);

  // Review & Rating State (Module 8)
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(4.8);
  const [pairedAccessories, setPairedAccessories] = useState([]);
  const [addedPairedId, setAddedPairedId] = useState(null);

  useEffect(() => {
    if (appliance) {
      // Module 2: Automatically track appliance in browsing history
      trackApplianceView(appliance, 'details_modal');

      const appId = appliance.appliance_id || appliance._id;
      publicFetch(`/api/feedback/?appliance_id=${appId}`)
        .then(res => res.json())
        .then(data => {
          if (data.feedbacks && data.feedbacks.length > 0) {
            setReviews(data.feedbacks);
          }
          if (data.average_rating) {
            setAvgRating(data.average_rating);
          }
        })
        .catch(err => console.error("Error fetching reviews:", err));

      // Fetch Companion Recommendations for this appliance
      publicFetch(`/api/recommendations/?appliance_id=${appId}&filter=room_bundles`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setPairedAccessories(data.slice(0, 3));
          }
        })
        .catch(err => console.error("Error fetching paired accessories:", err));
    }
  }, [appliance]);

  if (!appliance) return null;

  const pricing = appliance.pricing || {
    "3": appliance.monthly_price,
    "6": Math.round(appliance.monthly_price * 0.9),
    "12": Math.round(appliance.monthly_price * 0.8)
  };
  
  const securityDeposit = appliance.security_deposit || Math.round(appliance.monthly_price * 1.5);
  const currentRent = pricing[tenure];
  const stockQuantity = typeof appliance.stock_quantity === 'number' ? appliance.stock_quantity : (parseInt(appliance.stock_quantity, 10) || 0);
  const isOutOfStock = stockQuantity <= 0;

  // Refurbished Buy calculations (Rentora pre-loved certified)
  const refurbishedPrice = Math.round(appliance.monthly_price * 5.2);
  const originalMRP = Math.round(refurbishedPrice * 2.8);
  const discountPercent = Math.round(((originalMRP - refurbishedPrice) / originalMRP) * 100);
  const buybackValue = Math.round(refurbishedPrice * 0.6);

  const handleAdd = async () => {
    setIsAdding(true);
    const appId = appliance.appliance_id || appliance._id;
    if (mode === 'rent') {
      await onAddToCart(appId, tenure);
    } else {
      // Adding as refurbished buy
      const buyItem = {
        ...appliance,
        is_refurbished_buy: true,
        purchase_price: refurbishedPrice,
        warranty: '1 Year Full Care Warranty'
      };
      await onAddToCart(appId, "BUY", buyItem);
    }
    setIsAdding(false);
  };

  const handleVerifyPincode = (e) => {
    e.preventDefault();
    if (pincode.length === 6) {
      setPincodeVerified(true);
    }
  };

  return (
    <div 
      className="product-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="product-modal-container">
        {/* Close Button - Stays securely anchored at top-right */}
        <button 
          onClick={onClose} 
          className="product-modal-close-btn"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
        
        {/* Responsive 2-Column Grid (side-by-side on desktop, stacked on mobile) */}
        <div className="product-modal-grid">
          
          {/* Left Column: Image & Assurance Badges */}
          <div className="product-modal-left-col">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', maxHeight: '280px', width: '100%' }}>
            <img 
              src={appliance.image_url} 
              alt={appliance.rental_name} 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=600';
              }}
            />
          </div>

          {/* Rentora Value Highlights */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem', marginTop: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
              Why Choose Rentora (Quality Assurance):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} color="#16a34a" />
                <span><strong>₹10,000 Damage Waiver</strong> (Covers pet scratches & spills)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={16} color="#0284c7" />
                <span><strong>Experience Swap:</strong> Refresh your style anytime</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={16} color="#e23744" />
                <span><strong>Free Intercity Relocation</strong> across 5 major metros</span>
              </div>
            </div>
          </div>

          {/* Module 8: Customer Ratings & Reviews */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827', textTransform: 'uppercase' }}>
                  Verified Customer Ratings
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                  <div style={{ display: 'flex', color: '#eab308' }}>
                    {[1, 2, 3, 4, 5].map(st => (
                      <Star key={st} size={13} fill={st <= Math.round(avgRating) ? '#eab308' : 'none'} color="#eab308" />
                    ))}
                  </div>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{avgRating}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({reviews.length} reviews)</span>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, background: '#f0fdf4', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                ✓ 100% Verified Renters
              </span>
            </div>

            {/* Reviews List */}
            <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {reviews.slice(0, 3).map((r, idx) => (
                <div key={idx} style={{ borderBottom: idx < 2 ? '1px solid #f1f5f9' : 'none', paddingBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{r.username}</span>
                    <div style={{ display: 'flex', color: '#eab308' }}>
                      {[1, 2, 3, 4, 5].map(st => (
                        <Star key={st} size={11} fill={st <= (r.rating || 5) ? '#eab308' : 'none'} color="#eab308" />
                      ))}
                    </div>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#475569', lineHeight: 1.3 }}>
                    "{r.comment}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Right Column: Details, Mode Toggle, Tenure / Buy Selector */}
          <div className="product-modal-right-col">
          
          {/* Top Category and Rent vs Buy Refurbished Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', color: '#e23744', textTransform: 'uppercase' }}>
              {appliance.category_id}
            </span>

            {/* Rentora Dual-Mode Switcher */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => setMode('rent')}
                style={{
                  background: mode === 'rent' ? '#ffffff' : 'transparent',
                  color: mode === 'rent' ? '#111827' : '#64748b',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: mode === 'rent' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Rent
              </button>
              <button
                type="button"
                onClick={() => setMode('buy_refurbished')}
                style={{
                  background: mode === 'buy_refurbished' ? '#e23744' : 'transparent',
                  color: mode === 'buy_refurbished' ? '#ffffff' : '#64748b',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: mode === 'buy_refurbished' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Buy Refurbished
              </button>
            </div>
          </div>

          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827', margin: '0 0 0.35rem 0', lineHeight: 1.2 }}>
            {appliance.rental_name}
          </h2>

          {/* Real-time Stock Availability Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            {stockQuantity > 3 ? (
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.65rem' }}>●</span> In Stock ({stockQuantity} units available for express dispatch)
              </span>
            ) : stockQuantity > 0 ? (
              <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.2rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                ⚠️ High Demand: Only {stockQuantity} left in stock!
              </span>
            ) : (
              <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.2rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                🚫 Currently Out of Stock (Fulfillment in 2-3 Days)
              </span>
            )}
          </div>

          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            {appliance.description}
          </p>

          {/* Pincode & Express Delivery Strip */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={16} color="#e23744" />
              <div style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                Deliver to <strong>{pincode}</strong>: <span style={{ color: '#16a34a', fontWeight: 700 }}>Express 72h Delivery</span>
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#ffffff', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              Free Assembly
            </span>
          </div>
          
          {/* MODE 1: RENT */}
          {mode === 'rent' ? (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827', margin: 0 }}>Select Rental Commitment</h3>
                  <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>Longer tenure = Lower rent</span>
                </div>
                <div className="product-modal-tenure-grid">
                  {['3', '6', '12'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTenure(t)}
                      style={{
                        border: tenure === t ? '2px solid #e23744' : '1px solid #e2e8f0',
                        backgroundColor: tenure === t ? '#fff5f5' : '#ffffff',
                        color: tenure === t ? '#e23744' : '#475569',
                        borderRadius: '12px',
                        padding: '0.75rem 0.5rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{t} Months</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.2rem' }}>₹{pricing[t]}/mo</div>
                      {t === '12' && (
                        <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 700 }}>
                          20% OFF
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Rent Price Breakdown */}
              <div style={{ backgroundColor: '#fafafa', padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Refundable Security Deposit</div>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: '1rem' }}>₹{securityDeposit.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '0.7rem', color: '#16a34a' }}>100% instant refund upon return</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Monthly Subscription</div>
                  <div style={{ fontWeight: 900, fontSize: '1.65rem', color: '#e23744' }}>₹{currentRent.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>
          ) : (
            /* MODE 2: BUY REFURBISHED (RENTORA PRE-LOVED STORE) */
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: '14px',
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b91c1c', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  <Award size={14} />
                  <span>Rentora Certified Pre-Loved</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111827' }}>
                    ₹{refurbishedPrice.toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: '0.95rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                    ₹{originalMRP.toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 800 }}>
                    {discountPercent}% OFF
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1rem', fontSize: '0.8rem', color: '#374151' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Check size={14} color="#16a34a" />
                    <span><strong>25-Point Rigorous Quality Inspection</strong> passed</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Check size={14} color="#16a34a" />
                    <span><strong>1-Year Full Coverage Care Warranty</strong> included</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Check size={14} color="#16a34a" />
                    <span><strong>Assured Buyback Guarantee:</strong> Cash back up to ₹{buybackValue.toLocaleString('en-IN')} within 12 months</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Frequently Paired With This Item (Complete Room Set) */}
          {pairedAccessories.length > 0 && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  <Sparkles size={14} color="#e23744" />
                  <span>Pairs Well With This Item (15% Combo Discount)</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, background: '#dcfce7', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  Room Combo
                </span>
              </div>

              <div className="product-modal-paired-scroll">
                {pairedAccessories.map((p, idx) => {
                  const item = p.recommended_appliance_details;
                  if (!item) return null;
                  const itemId = item.appliance_id || item._id;
                  const isAdded = addedPairedId === itemId;

                  return (
                    <div
                      key={p.recommendation_id || idx}
                      className="product-modal-paired-card"
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: '#f1f5f9' }}>
                        <img src={item.image_url} alt={item.rental_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=200'; }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.rental_name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          ₹{item.monthly_price}/mo
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setAddedPairedId(itemId);
                          if (onAddToCart) {
                            await onAddToCart(itemId, "6", item);
                          }
                          setTimeout(() => setAddedPairedId(null), 2500);
                        }}
                        style={{
                          background: isAdded ? '#059669' : '#ffffff',
                          color: isAdded ? '#ffffff' : '#e23744',
                          border: `1px solid ${isAdded ? '#059669' : '#e23744'}`,
                          borderRadius: '6px',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        {isAdded ? 'Added ✓' : '+ Add'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Sticky Bottom Action Bar */}
          <div style={{
            position: 'sticky',
            bottom: 0,
            background: 'var(--surface-color, #ffffff)',
            paddingTop: '0.85rem',
            paddingBottom: '0.25rem',
            marginTop: 'auto',
            zIndex: 10,
            boxShadow: '0 -8px 16px -6px rgba(0, 0, 0, 0.06)'
          }}>
            <button 
              onClick={handleAdd}
              disabled={isAdding || (isOutOfStock && mode === 'rent')}
              style={{
                width: '100%',
                backgroundColor: (isOutOfStock && mode === 'rent') ? '#94a3b8' : '#e23744',
                color: 'white',
                fontWeight: 800,
                fontSize: '1rem',
                padding: '1rem',
                borderRadius: '12px',
                border: 'none',
                cursor: (isAdding || (isOutOfStock && mode === 'rent')) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: (isOutOfStock && mode === 'rent') ? 'none' : '0 4px 14px rgba(226, 55, 68, 0.35)',
                opacity: isAdding ? 0.7 : 1
              }}
            >
              {isAdding 
                ? 'Processing...' 
                : (isOutOfStock && mode === 'rent')
                  ? 'Out of Stock • Restocking Soon'
                  : mode === 'rent'
                    ? `Rent Now • ₹${(currentRent + securityDeposit).toLocaleString('en-IN')} Due Today`
                    : `Buy Refurbished • ₹${refurbishedPrice.toLocaleString('en-IN')}`}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailsModal;
