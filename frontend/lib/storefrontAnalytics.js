const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function sessionId() {
  let value = sessionStorage.getItem('loadlyx_store_session');
  if (!value) { value = crypto.randomUUID(); sessionStorage.setItem('loadlyx_store_session', value); }
  return value;
}

export function trackStorefrontEvent(tenantSlug, eventName, metadata = {}) {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({ eventName, sessionId: sessionId(), path: window.location.pathname + window.location.search, metadata });
  fetch(API_URL + '/orders/analytics', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', 'x-tenant-slug': tenantSlug }, body }).catch(() => {});
}
