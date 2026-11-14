import React, { useState } from 'react';
import { Calculator, CheckCircle, ArrowRight } from 'lucide-react';

const PRODUCTS = [
  {
    name: "Washing Machine",
    buyPrice: 32000,
    rentPerMonth: 808,
    maintenancePerYear: 3500,
    resaleLossPct: 0.55,
    img: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&q=80&w=300"
  },
  {
    name: "Double Door Refrigerator",
    buyPrice: 38000,
    rentPerMonth: 899,
    maintenancePerYear: 4000,
    resaleLossPct: 0.50,
    img: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&q=80&w=300"
  },
  {
    name: "3-Seater Living Room Sofa",
    buyPrice: 36000,
    rentPerMonth: 925,
    maintenancePerYear: 2500,
    resaleLossPct: 0.60,
    img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=300"
  },
  {
    name: "1.5 Ton Inverter AC",
    buyPrice: 44000,
    rentPerMonth: 1199,
    maintenancePerYear: 5000,
    resaleLossPct: 0.55,
    img: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&q=80&w=300"
  }
];

export const RentVsBuyCalculator = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [months, setMonths] = useState(12);

  const product = PRODUCTS[selectedIdx];

  // Buying Cost Calculation:
  // Upfront Buy Price + Pro-rated maintenance - Estimated Salvage value if resold after months
  const totalMaintenance = Math.round((product.maintenancePerYear / 12) * months);
  const totalRentCost = product.rentPerMonth * months;
  const buyCostGross = product.buyPrice + totalMaintenance;
  
  // Resale value decreases with time
  const depreciationFactor = Math.min(0.75, (product.resaleLossPct * (months / 12)));
  const estimatedResaleValue = Math.round(product.buyPrice * (1 - depreciationFactor));
  const buyCostNet = buyCostGross - estimatedResaleValue;

  // Immediate Upfront Cashflow Saved:
  const cashSavedUpfront = product.buyPrice - (product.rentPerMonth * 3); // vs initial deposit & 1st month

  return (
    <div 
      className="calculator-card panel"
      style={{
        background: 'var(--surface-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '2.5rem',
        boxShadow: 'var(--card-shadow)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative gradient blur */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ background: 'var(--primary-glow)', color: 'var(--primary-color)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(226,55,68,0.2)' }}>
              <Calculator size={13} /> RMI Calculator
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Financial Clarity</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Renting vs. Buying Calculator
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.35rem 0 0' }}>
            See how much upfront capital and hassle you save by choosing Rentora over buying.
          </p>
        </div>

        {/* Product Selector Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--surface-muted)', border: '1px solid var(--border-color)', padding: '0.35rem', borderRadius: '12px' }}>
          {PRODUCTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIdx(idx)}
              style={{
                background: selectedIdx === idx ? 'var(--surface-color)' : 'transparent',
                color: selectedIdx === idx ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: selectedIdx === idx ? '1px solid var(--border-color)' : '1px solid transparent',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: selectedIdx === idx ? 700 : 500,
                cursor: 'pointer',
                boxShadow: selectedIdx === idx ? 'var(--card-shadow)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {p.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Control Slider & Comparison Results */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '2.5rem', alignItems: 'center' }}>
        
        {/* Left Side: Product preview & Duration slider */}
        <div>
          {/* Selected Product Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            background: 'var(--surface-muted)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.25rem',
            marginBottom: '2rem'
          }}>
            <img 
              src={product.img} 
              alt={product.name}
              style={{ width: '84px', height: '84px', objectFit: 'cover', borderRadius: '12px' }}
            />
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                {product.name}
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Buying Price: <strong style={{ color: 'var(--text-primary)' }}>₹{product.buyPrice.toLocaleString()}</strong></span>
                <span style={{ color: 'var(--primary-color)' }}>Rentora RMI: <strong>₹{product.rentPerMonth}/mo</strong></span>
              </div>
            </div>
          </div>

          {/* Tenure Slider */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Duration of Use: <span style={{ color: 'var(--primary-color)' }}>{months} Months</span>
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {months >= 12 ? 'Long-term max discount active' : 'Flexible duration'}
              </span>
            </div>

            <input 
              type="range"
              min="3"
              max="24"
              step="3"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--primary-color)',
                height: '6px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              <span>3 Mos</span>
              <span>6 Mos</span>
              <span>12 Mos</span>
              <span>18 Mos</span>
              <span>24 Mos</span>
            </div>
          </div>

          {/* Value comparison bullets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.825rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 600 }}>
              <CheckCircle size={15} /> <span>Free Annual Servicing (₹0)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 600 }}>
              <CheckCircle size={15} /> <span>Free Inter-City Relocation (₹0)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 600 }}>
              <CheckCircle size={15} /> <span>100% Refundable Deposit</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 600 }}>
              <CheckCircle size={15} /> <span>Upgrade to New Model Anytime</span>
            </div>
          </div>
        </div>

        {/* Right Side: Visual Comparison Cards */}
        <div style={{
          background: 'var(--surface-muted)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '2rem',
          position: 'relative'
        }}>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary-color)', fontWeight: 700, marginBottom: '0.35rem' }}>
            Cost Breakdown over {months} Months
          </div>

          {/* Upfront Cash Saved Highlight */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              ₹{cashSavedUpfront.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700, marginTop: '0.2rem' }}>
              ✦ Instant Upfront Cash Saved from Day 1
            </div>
          </div>

          {/* Compare Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Rentora Subscription ({months} mos):</span>
              <span style={{ fontWeight: 800, color: 'var(--primary-color)' }}>₹{totalRentCost.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Initial Retail Purchase Cost:</span>
              <span style={{ fontWeight: 600, color: '#ef4444', textDecoration: 'line-through' }}>₹{product.buyPrice.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Estimated Repair & Maintenance:</span>
              <span style={{ fontWeight: 600, color: '#ef4444' }}>+ ₹{totalMaintenance.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Net Buying Expense (after resale):</span>
              <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>₹{buyCostNet.toLocaleString()}</span>
            </div>
          </div>

          {/* Call to action */}
          <button
            onClick={() => {
              const catalog = document.getElementById('catalog-listing-section');
              if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              width: '100%',
              background: '#e23744',
              color: '#ffffff',
              border: 'none',
              padding: '0.85rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(226, 55, 68, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Rent {product.name} Now</span>
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
};
