import React from 'react';
import { MapPin, Check, X } from 'lucide-react';

const CITIES = [
  { name: 'Bangalore', state: 'Karnataka' },
  { name: 'Mumbai', state: 'Maharashtra' },
  { name: 'Delhi', state: 'NCR' },
  { name: 'Hyderabad', state: 'Telangana' },
  { name: 'Pune', state: 'Maharashtra' }
];

function CitySelectionModal({ onCitySelect, isOpen, onClose, currentCity }) {
  if (!isOpen) return null;

  const activeCity = currentCity || localStorage.getItem('rentora_city') || 'Hyderabad';

  const handleSelect = (cityName) => {
    localStorage.setItem('rentora_city', cityName);
    if (onCitySelect) onCitySelect(cityName);
    if (onClose) onClose();
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      <div style={{
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        background: 'white',
        borderRadius: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        margin: 'auto',
        animation: 'modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Close Button */}
        {onClose && (
          <button 
            type="button"
            id="close-city-modal"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#e23744'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}

        {/* Header Icon */}
        <div style={{
          width: '68px',
          height: '68px',
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
          boxShadow: '0 8px 16px rgba(226, 55, 68, 0.16)'
        }}>
          <MapPin size={32} color="#e23744" />
        </div>

        <h2 style={{ fontSize: '1.85rem', marginBottom: '0.5rem', color: '#111827', fontWeight: '800', letterSpacing: '-0.02em' }}>
          Select Delivery City
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
          Choose your city to browse available furniture, appliances, and personalized rental plans in your area.
        </p>
        
        {/* City Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem' }}>
          {CITIES.map((c) => {
            const isSelected = activeCity.toLowerCase() === c.name.toLowerCase();
            return (
              <button
                key={c.name}
                type="button"
                id={`city-select-${c.name.toLowerCase()}`}
                onClick={() => handleSelect(c.name)}
                style={{
                  background: isSelected ? '#fff5f5' : 'white',
                  border: isSelected ? '2px solid #e23744' : '1.5px solid #e5e7eb',
                  borderRadius: '1rem',
                  padding: '1.15rem 0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  position: 'relative',
        margin: 'auto'
                }}
                onMouseOver={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {isSelected && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: '#e23744',
                    color: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
                <span style={{
                  fontSize: '1.05rem',
                  fontWeight: isSelected ? 700 : 600,
                  color: isSelected ? '#e23744' : '#1f2937'
                }}>
                  {c.name}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  color: isSelected ? '#e23744' : '#9ca3af',
                  fontWeight: 500
                }}>
                  {c.state}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CitySelectionModal;
