import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Check, Heart, Loader2 } from 'lucide-react';

const CURATED_COMBOS = [
  {
    id: 'combo_living',
    title: 'Nordic Minimalist Living Room Combo',
    room: 'Living Room',
    itemsIncluded: ['3-Seater Velvet Sofa', 'Scandinavian Teak Center Table', 'Minimalist Media Console'],
    monthlyPrice: 1299,
    originalPrice: 1699,
    savingsBadge: 'Save ₹400/mo',
    image: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&q=80&w=800',
    tag: 'Trending Combo'
  },
  {
    id: 'combo_wfh',
    title: 'Executive Work-From-Home Productivity Suite',
    room: 'Home Office',
    itemsIncluded: ['High-Back Ergonomic Mesh Chair', 'Motorized Standing Desk', 'Warm Ambient LED Desk Lamp'],
    monthlyPrice: 849,
    originalPrice: 1149,
    savingsBadge: 'Save ₹300/mo',
    image: 'https://images.unsplash.com/photo-1519974719765-e6559eac2575?auto=format&fit=crop&q=80&w=800',
    tag: 'WFH Best Seller'
  },
  {
    id: 'combo_bedroom',
    title: 'Plush Comfort Master Bedroom Suite',
    room: 'Bedroom',
    itemsIncluded: ['Teak Queen Bed Frame', 'Orthopedic Memory Foam Mattress', 'Twin Nightstands with Drawers'],
    monthlyPrice: 1199,
    originalPrice: 1549,
    savingsBadge: 'Save ₹350/mo',
    image: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=800',
    tag: 'Couples Favorite'
  },
  {
    id: 'combo_appliances',
    title: 'Smart Kitchen & Laundry Essentials Duo',
    room: 'Appliances',
    itemsIncluded: ['260L Frost-Free Double Door Fridge', '7 Kg Smart Inverter Washing Machine', '20L Microwave'],
    monthlyPrice: 1549,
    originalPrice: 2099,
    savingsBadge: 'Save ₹550/mo',
    image: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&q=80&w=800',
    tag: 'Essential Pack'
  }
];

export default function CuratedRoomCombos({ onRentCombo }) {
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState({});
  const [toastInfo, setToastInfo] = useState(null);
  const navigate = useNavigate();

  const handleRent = async (combo) => {
    setAddingId(combo.id);
    try {
      if (onRentCombo) {
        await onRentCombo(combo);
      }
      setAddedIds(prev => ({ ...prev, [combo.id]: true }));
      setToastInfo({
        title: combo.title,
        price: combo.monthlyPrice,
        room: combo.room
      });
      setTimeout(() => {
        setAddedIds(prev => ({ ...prev, [combo.id]: false }));
      }, 3000);
      setTimeout(() => {
        setToastInfo(null);
      }, 5000);
    } catch (e) {
      console.error("Error renting combo:", e);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <section id="curated-combos-section" className="curated-combos-section" style={{ maxWidth: '1280px', margin: '4rem auto 0', padding: '0 1.5rem' }}>
      
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-color)', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            <Sparkles size={14} />
            <span>RENTORA 1-CLICK ROOM BUNDLES</span>
          </div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Curated <span style={{ color: 'var(--primary-color)' }}>Room Combos</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.3rem 0 0' }}>
            Furnish entire rooms in a single click with pre-bundled discounts and zero hassle.
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--surface-muted)',
          border: '1px solid var(--border-color)',
          padding: '0.45rem 0.9rem',
          borderRadius: '999px',
          fontSize: '0.8rem',
          color: 'var(--text-primary)',
          fontWeight: 700
        }}>
          <ShieldCheck size={16} color="var(--primary-color)" />
          <span>Includes Free Assembly & ₹10,000 Damage Cover</span>
        </div>
      </div>

      {/* 4 Combos Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.75rem'
      }}>
        {CURATED_COMBOS.map((combo) => {
          const isAdding = addingId === combo.id;
          const isAdded = !!addedIds[combo.id];

          return (
            <div
              key={combo.id}
              className="curated-combo-card panel"
              style={{
                background: 'var(--surface-color)',
                borderRadius: '20px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--card-shadow)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--card-shadow)';
              }}
            >
              {/* Image Header with Badges */}
              <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
                <img
                  src={combo.image}
                  alt={combo.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800';
                  }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />

                <span style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'var(--primary-color)',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px'
                }}>
                  {combo.tag}
                </span>

                <span style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px'
                }}>
                  {combo.savingsBadge}
                </span>
              </div>

              {/* Content */}
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {combo.room}
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0 0.85rem', lineHeight: 1.3 }}>
                  {combo.title}
                </h3>

                {/* Items in Combo */}
                <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    What's Included:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {combo.itemsIncluded.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <Check size={14} color="#16a34a" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price & Action Button */}
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                      ₹{combo.originalPrice}/mo
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                      ₹{combo.monthlyPrice.toLocaleString('en-IN')}<span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>/mo</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isAdding}
                    onClick={() => handleRent(combo)}
                    style={{
                      background: isAdded ? '#16a34a' : '#e23744',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.6rem 1.15rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: isAdding ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: isAdded ? '0 2px 8px rgba(22, 163, 74, 0.35)' : '0 2px 8px rgba(226, 55, 68, 0.25)',
                      transition: 'all 0.2s ease',
                      opacity: isAdding ? 0.8 : 1
                    }}
                    onMouseOver={(e) => { 
                      if (!isAdded) e.currentTarget.style.background = '#c82333'; 
                    }}
                    onMouseOut={(e) => { 
                      if (!isAdded) e.currentTarget.style.background = '#e23744'; 
                    }}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="animate-spin" size={15} />
                        <span>Adding...</span>
                      </>
                    ) : isAdded ? (
                      <>
                        <Check size={15} />
                        <span>Added to Cart!</span>
                      </>
                    ) : (
                      <>
                        <span>Rent Combo</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Toast when a combo is added */}
      {toastInfo && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#0f172a',
          color: '#ffffff',
          padding: '1rem 1.25rem',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          maxWidth: '440px',
          border: '1px solid rgba(255,255,255,0.15)'
        }}>
          <div style={{ background: '#16a34a', borderRadius: '50%', padding: '0.45rem', display: 'flex', flexShrink: 0 }}>
            <Check size={18} color="#ffffff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Combo Added to Cart!</div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
              {toastInfo.title} (₹{toastInfo.price}/mo)
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/cart')}
            style={{
              background: '#e23744',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 0.9rem',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            View Cart →
          </button>
          <button
            type="button"
            onClick={() => setToastInfo(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

    </section>
  );
}
