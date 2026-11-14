import { fetchWithAuth } from './api';

/**
 * Loads the Razorpay official checkout SDK script dynamically into the DOM
 * @returns {Promise<boolean>}
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById('razorpay-checkout-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('[Razorpay] Failed to load external checkout.js, sandbox fallbacks will be available.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

/**
 * Fetches Razorpay public configuration from the server
 */
export const fetchRazorpayConfig = async () => {
  try {
    const res = await fetchWithAuth('/api/payments/config');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[Razorpay] Could not fetch remote config, using defaults:', e);
  }
  return {
    key_id: 'rzp_test_rentoraLiveGateway',
    currency: 'INR',
    company_name: 'Rentora Technology Services',
    theme_color: '#e23744',
    is_test_mode: true
  };
};

/**
 * Creates an order on the backend for Razorpay checkout
 */
export const createRazorpayOrder = async (amount, notes = {}) => {
  const res = await fetchWithAuth('/api/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({
      amount: parseFloat(amount),
      currency: 'INR',
      notes
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create Razorpay payment order');
  }

  return await res.json();
};

/**
 * Verifies cryptographic HMAC-SHA256 signature on the backend
 */
export const verifyRazorpayPayment = async (paymentResponse) => {
  const res = await fetchWithAuth('/api/payments/verify-signature', {
    method: 'POST',
    body: JSON.stringify({
      razorpay_order_id: paymentResponse.razorpay_order_id,
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_signature: paymentResponse.razorpay_signature
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Payment signature verification failed');
  }

  return await res.json();
};
