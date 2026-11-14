/**
 * Rentora Client-Side Browsing History Management Utility
 * Dual-syncs with localStorage (0ms latency, guest support) and MongoDB (cross-device persistence)
 */
import { publicFetch } from './api';

const STORAGE_KEY = 'rentora_browsing_history';
const GUEST_KEY = 'rentora_guest_session_id';

/**
 * Returns a persistent guest session identifier
 */
export function getGuestSessionId() {
  let guestId = localStorage.getItem(GUEST_KEY);
  if (!guestId) {
    guestId = 'guest_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem(GUEST_KEY, guestId);
  }
  return guestId;
}

/**
 * Get cached local browsing history from localStorage
 */
export function getLocalBrowsingHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to parse local browsing history:', e);
    return [];
  }
}

/**
 * Save updated history to localStorage and broadcast event
 */
function saveLocalBrowsingHistory(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 30)));
    window.dispatchEvent(new CustomEvent('rentora:history_updated', { detail: { count: items.length } }));
  } catch (e) {
    console.warn('Failed to save browsing history to localStorage:', e);
  }
}

/**
 * Format relative time (e.g., "Just now", "5m ago", "2h ago", "Yesterday")
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return 'Recently';
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = Math.max(0, now - past);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

/**
 * Record an appliance view event (called when user clicks an item or opens its modal)
 */
export async function trackApplianceView(appliance, source = 'catalog') {
  if (!appliance) return;
  const appId = String(appliance.appliance_id || appliance._id);
  if (!appId) return;

  const now = new Date().toISOString();

  // 1. Immediately update localStorage for 0ms reactive UI rendering
  const localItems = getLocalBrowsingHistory();
  const existingIdx = localItems.findIndex(i => String(i.appliance_id || i._id) === appId);

  const historyItem = {
    appliance_id: appId,
    rental_name: appliance.rental_name || 'Appliance',
    category_id: appliance.category_id || 'Appliances',
    sub_category: appliance.sub_category || '',
    monthly_price: parseFloat(appliance.monthly_price || 0),
    security_deposit: parseFloat(appliance.security_deposit || (appliance.monthly_price * 1.5) || 0),
    image_url: appliance.image_url || '',
    stock_quantity: appliance.stock_quantity !== undefined ? appliance.stock_quantity : 5,
    rating: appliance.rating || 4.8,
    last_viewed_at: now,
    relative_time: 'Just now',
    source
  };

  let updatedList;
  if (existingIdx !== -1) {
    // Move to front with updated timestamp
    updatedList = [historyItem, ...localItems.filter((_, idx) => idx !== existingIdx)];
  } else {
    updatedList = [historyItem, ...localItems];
  }
  saveLocalBrowsingHistory(updatedList);

  // 2. Dispatch background API call to MongoDB
  try {
    const token = localStorage.getItem('access_token');
    const guestId = getGuestSessionId();
    const headers = {
      'Content-Type': 'application/json',
      'x-session-id': guestId
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = JSON.stringify({
      appliance_id: appId,
      source,
      session_id: guestId
    });

    const urls = [
      '/api/browsing-history/track',
      '/api/browsing-history/track',
      '/api/browsing-history/track'
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: payload
        });
        if (res.ok) break;
      } catch (err) {
        // Try fallback host
      }
    }
  } catch (e) {
    // Client-side fail-safe: local history remains valid even if network fails
  }
}

/**
 * Fetch browsing history from server with fallback to localStorage
 */
export async function fetchBrowsingHistory(limit = 15, city = '') {
  const token = localStorage.getItem('access_token');
  const guestId = getGuestSessionId();
  const headers = { 'x-session-id': guestId };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const cityParam = city ? `&city=${encodeURIComponent(city)}` : '';
  const query = `?limit=${limit}${cityParam}`;

  const urls = [
    `/api/browsing-history/${query}`,
    `/api/browsing-history/${query}`,
    `/api/browsing-history/${query}`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.history && Array.isArray(data.history)) {
          // Sync server history back to localStorage cache
          saveLocalBrowsingHistory(data.history);
          return data.history;
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  // If server offline or unreachable, return local cache
  return getLocalBrowsingHistory();
}

/**
 * Remove a specific item from browsing history
 */
export async function removeBrowsingItem(applianceId) {
  const cleanId = String(applianceId);

  // 1. Update localStorage
  const current = getLocalBrowsingHistory();
  const updated = current.filter(i => String(i.appliance_id || i._id) !== cleanId);
  saveLocalBrowsingHistory(updated);

  // 2. Call server
  const token = localStorage.getItem('access_token');
  const guestId = getGuestSessionId();
  const headers = { 'x-session-id': guestId };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    await publicFetch(`/api/browsing-history/${encodeURIComponent(cleanId)}`, {
      method: 'DELETE',
      headers
    });
  } catch (e) {}

  return updated;
}

/**
 * Clear the entire browsing history
 */
export async function clearAllBrowsingHistory() {
  // 1. Clear local
  saveLocalBrowsingHistory([]);

  // 2. Call server
  const token = localStorage.getItem('access_token');
  const guestId = getGuestSessionId();
  const headers = { 'x-session-id': guestId };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    await publicFetch('/api/browsing-history/', {
      method: 'DELETE',
      headers
    });
  } catch (e) {}

  return [];
}
