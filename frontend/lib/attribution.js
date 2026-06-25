export function getAttributionData() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem('loadlyx_attribution');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function persistAttributionFromLocation() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const existing = getAttributionData();
    const params = url.searchParams;
    const sessionId = existing.sessionId || window.sessionStorage.getItem('loadlyx_session_id') || crypto.randomUUID();
    window.sessionStorage.setItem('loadlyx_session_id', sessionId);

    const next = {
      sessionId,
      referrer: existing.referrer || document.referrer || '',
      landingPage: existing.landingPage || `${url.pathname}${url.search}`,
      utmSource: params.get('utm_source') || existing.utmSource || '',
      utmMedium: params.get('utm_medium') || existing.utmMedium || '',
      utmCampaign: params.get('utm_campaign') || existing.utmCampaign || '',
      utmTerm: params.get('utm_term') || existing.utmTerm || '',
      utmContent: params.get('utm_content') || existing.utmContent || ''
    };

    window.localStorage.setItem('loadlyx_attribution', JSON.stringify(next));
    return next;
  } catch {
    return {};
  }
}
