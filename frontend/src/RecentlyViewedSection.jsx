import React, { useState, useEffect, useRef } from 'react';
import { History, Trash2, X, ChevronLeft, ChevronRight, Eye, ShoppingBag, Star, Zap } from 'lucide-react';
import { fetchBrowsingHistory, removeBrowsingItem, clearAllBrowsingHistory } from './utils/browsingHistory';

export default function RecentlyViewedSection({ onSelectAppliance, onAddToCart, city }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const scrollContainerRef = useRef(null);

  const loadHistory = async () => {
    try {
      const items = await fetchBrowsingHistory(20, city);
      setHistoryItems(items);
    } catch (e) {
      console.warn('Error loading browsing history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();

    // Listen to real-time history updates from anywhere in the app
    const handleUpdate = () => {
      loadHistory();
    };

    window.addEventListener('rentora:history_updated', handleUpdate);
    return () => {
      window.removeEventListener('rentora:history_updated', handleUpdate);
    };
  }, [city]);

  const handleRemove = async (e, applianceId) => {
    e.stopPropagation();
    const updated = await removeBrowsingItem(applianceId);
    setHistoryItems(updated);
  };

  const handleClearAll = async () => {
    await clearAllBrowsingHistory();
    setHistoryItems([]);
    setShowClearConfirm(false);
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!loading && historyItems.length === 0) {
    return null; // Clean: do not take up space if nothing viewed yet
  }

  return (
    <section 
      id="recently-viewed-section"
      style={{
        maxWidth: '1360px',
        margin: '2rem auto 2.5rem',
        padding: '0 1.25rem',
        boxSizing: 'border-box'
      }}
    >
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem',
        borderBottom: '1px solid var(--border-color, #f1f5f9)',
        paddingBottom: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.15)'
          }}>
            <History size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.02em'
              }}>
                Recently Viewed Appliances
              </h2>
              <span style={{
                background: '#f1f5f9',
                color: '#475569',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                border: '1px solid #e2e8f0'
              }}>
                {historyItems.length}
              </span>
            </div>
            <p style={{
              margin: '0.15rem 0 0',
              fontSize: '0.85rem',
              color: '#64748b'
            }}>
              Quickly pick up where you left off or compare features.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {showClearConfirm ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', padding: '4px 10px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
              <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>Clear all?</span>
              <button
                onClick={handleClearAll}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Yes, Clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  background: 'transparent',
                  color: '#64748b',
                  border: 'none',
                  padding: '3px 6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              title="Clear all viewed items"
            >
              <Trash2 size={14} />
              Clear History
            </button>
          )}

          {/* Navigation Arrows for Carousel */}
          {historyItems.length > 4 && (
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={() => scroll('left')}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                aria-label="Scroll left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scroll('right')}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                aria-label="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Carousel Container */}
      <div
        ref={scrollContainerRef}
        style={{
          display: 'flex',
          gap: '1.1rem',
          overflowX: 'auto',
          paddingBottom: '0.75rem',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'thin',
          msOverflowStyle: 'none'
        }}
        className="hide-scrollbar-when-idle"
      >
        {historyItems.map((item) => {
          const appId = item.appliance_id || item._id;
          const price = item.monthly_price || 499;
          const deposit = item.security_deposit || Math.round(price * 1.5);
          const inStock = item.in_stock !== undefined ? item.in_stock : (item.stock_quantity > 0);

          return (
            <div
              key={appId}
              onClick={() => onSelectAppliance && onSelectAppliance(item)}
              style={{
                flex: '0 0 260px',
                scrollSnapAlign: 'start',
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                position: 'relative',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.05)';
              }}
            >
              {/* Top Bar inside card: Relative Time + Remove Button */}
              <div style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                right: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 2
              }}>
                <span style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(4px)',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <Eye size={10} />
                  {item.relative_time || 'Recent'}
                </span>

                <button
                  onClick={(e) => handleRemove(e, appId)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fee2e2';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.color = '#64748b';
                  }}
                  title="Remove from history"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Product Thumbnail */}
              <div style={{
                height: '145px',
                width: '100%',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.rental_name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      padding: '0.75rem',
                      boxSizing: 'border-box',
                      transition: 'transform 0.3s ease'
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&auto=format&fit=crop';
                    }}
                  />
                ) : (
                  <Zap size={32} color="#94a3b8" />
                )}

                {/* Subcategory Pill */}
                {item.sub_category && (
                  <span style={{
                    position: 'absolute',
                    bottom: '6px',
                    left: '8px',
                    background: 'rgba(255,255,255,0.92)',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#475569',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {item.sub_category}
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div style={{
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                justifyContent: 'space-between'
              }}>
                <div>
                  {/* Rating & Stock */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.35rem'
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#059669'
                    }}>
                      <Star size={12} fill="#059669" color="#059669" />
                      {item.rating || 4.8}
                    </span>

                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: inStock ? '#16a34a' : '#d97706'
                    }}>
                      {inStock ? '● In Stock' : '⚡ Restocking'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    margin: '0 0 0.45rem',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '2.4rem'
                  }} title={item.rental_name}>
                    {item.rental_name}
                  </h3>
                </div>

                {/* Pricing & CTA */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginTop: '0.35rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px dashed #f1f5f9'
                  }}>
                    <div>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#e23744' }}>
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                        /mo
                      </span>
                    </div>

                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      Deposit: ₹{deposit.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Quick Rent Action */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddToCart) {
                        onAddToCart(appId, '3');
                      } else if (onSelectAppliance) {
                        onSelectAppliance(item);
                      }
                    }}
                    style={{
                      width: '100%',
                      marginTop: '0.65rem',
                      padding: '0.45rem 0',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#1e293b',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e23744';
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.borderColor = '#e23744';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.color = '#1e293b';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                  >
                    <ShoppingBag size={13} />
                    Rent Now
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
