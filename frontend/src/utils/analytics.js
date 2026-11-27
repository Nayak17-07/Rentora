/**
 * Lightweight privacy-respecting analytics helper.
 * Respects cookie consent (`rentora_cookie_consent`) and records pageviews
 * locally + dispatches to Google Analytics (if window.gtag is configured).
 */

const CONSENT_KEY = 'rentora_cookie_consent';

export function hasAnalyticsConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    return JSON.parse(raw).status === 'accepted';
  } catch {
    return false;
  }
}

export function trackPageView(pathname) {
  if (!hasAnalyticsConsent()) return;
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', { page_path: pathname });
  }
}
