import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

let addToastHandler = null;

export const showToast = {
  success: (message, title = 'Success') => {
    if (addToastHandler) addToastHandler({ id: Date.now() + Math.random(), type: 'success', title, message });
    else console.log(`[Toast Success] ${title}: ${message}`);
  },
  error: (message, title = 'Error') => {
    if (addToastHandler) addToastHandler({ id: Date.now() + Math.random(), type: 'error', title, message });
    else console.error(`[Toast Error] ${title}: ${message}`);
  },
  info: (message, title = 'Notification') => {
    if (addToastHandler) addToastHandler({ id: Date.now() + Math.random(), type: 'info', title, message });
    else console.log(`[Toast Info] ${title}: ${message}`);
  }
};

// Global fallback attachment
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    addToastHandler = (newToast) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4500);
    };

    return () => {
      addToastHandler = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        maxWidth: '380px',
        width: '100%',
        pointerEvents: 'none'
      }}
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        const borderColor = isSuccess ? '#bbf7d0' : isError ? '#fecaca' : '#bfdbfe';
        const bgColor = isSuccess ? '#f0fdf4' : isError ? '#fef2f2' : '#eff6ff';
        const iconColor = isSuccess ? '#16a34a' : isError ? '#dc2626' : '#2563eb';
        const titleColor = isSuccess ? '#166534' : isError ? '#991b1b' : '#1e40af';
        const descColor = isSuccess ? '#15803d' : isError ? '#b91c1c' : '#1d4ed8';

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: bgColor,
              border: `1px solid ${borderColor}`,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ flexShrink: 0, marginTop: '2px' }}>
              {isSuccess && <CheckCircle2 size={18} color={iconColor} />}
              {isError && <AlertCircle size={18} color={iconColor} />}
              {!isSuccess && !isError && <Info size={18} color={iconColor} />}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: titleColor, lineHeight: 1.25 }}>
                {toast.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: descColor, marginTop: '0.2rem', wordBreak: 'break-word', lineHeight: 1.35 }}>
                {toast.message}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              style={{
                flexShrink: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                color: titleColor,
                opacity: 0.6,
                borderRadius: '4px'
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '0.6')}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

