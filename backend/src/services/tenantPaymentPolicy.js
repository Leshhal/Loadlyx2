const PLATFORM_STRIPE_ALLOWED = 'PLATFORM_STRIPE_ALLOWED';

export function stripeProviderMode(secret = '') {
  const normalized = String(secret).trim();
  if (!normalized) return 'CONFIGURATION REQUIRED';
  return normalized.startsWith('sk_live_') ? 'LIVE' : 'TEST';
}

export function stripeAvailability(tenant, secret = '') {
  const mode = stripeProviderMode(secret);
  if (!tenant || tenant.isDemo || tenant.stripePolicy !== PLATFORM_STRIPE_ALLOWED) {
    return { available: false, enabled: false, status: 'DISABLED', mode };
  }
  if (mode === 'CONFIGURATION REQUIRED') {
    return { available: false, enabled: Boolean(tenant.stripeEnabled), status: mode, mode };
  }
  return { available: Boolean(tenant.stripeEnabled), enabled: Boolean(tenant.stripeEnabled), status: tenant.stripeEnabled ? mode : 'DISABLED', mode };
}

export function paypalAvailability(tenant, { configured = false, mode = 'SANDBOX', merchantId = '' } = {}) {
  if (!tenant || tenant.isDemo || !tenant.paypalEnabled) return { available: false, enabled: false, status: 'DISABLED', mode };
  if (!configured || !merchantId) return { available: false, enabled: true, status: 'CONFIGURATION REQUIRED', mode };
  return { available: true, enabled: true, status: mode === 'LIVE' ? 'LIVE' : 'SANDBOX', mode };
}
