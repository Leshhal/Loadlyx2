const MOVING_SUPPLIES_TENANT_ID = 'tenant-moving-supplies';

export function affirmConfiguration() {
  const environment = String(process.env.AFFIRM_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const configured = Boolean(process.env.AFFIRM_PUBLIC_API_KEY && process.env.AFFIRM_PRIVATE_API_KEY);
  const configuredUrl = String(process.env.AFFIRM_API_URL || (environment === 'LIVE' ? 'https://api.global.affirm.com' : 'https://api.global.sandbox.affirm.com'));
  const baseUrl = configuredUrl.endsWith('/') ? configuredUrl.slice(0, -1) : configuredUrl;
  return {
    environment,
    configured,
    publicKey: process.env.AFFIRM_PUBLIC_API_KEY || '',
    privateKey: process.env.AFFIRM_PRIVATE_API_KEY || '',
    baseUrl,
    scriptUrl: environment === 'LIVE' ? 'https://cdn1.affirm.com/js/v2/affirm.js' : 'https://cdn1-sandbox.affirm.com/js/v2/affirm.js'
  };
}

export function affirmAvailability(tenant, settings = {}, config = affirmConfiguration()) {
  const authorized = tenant?.id === MOVING_SUPPLIES_TENANT_ID && !tenant?.isDemo;
  const enabled = authorized && Boolean(settings.affirmEnabled);
  let status = 'DISABLED';
  if (authorized && !config.configured) status = 'NOT CONFIGURED';
  else if (enabled && config.environment === 'LIVE') status = 'PRODUCTION CONFIGURED';
  else if (enabled) status = 'SANDBOX READY';
  return { available: enabled && config.configured, enabled, authorized, configured: config.configured, status, environment: config.environment, publicKey: enabled && config.configured ? config.publicKey : null, scriptUrl: enabled && config.configured ? config.scriptUrl : null, liveVerified: false };
}

async function affirmRequest(path, body, idempotencyKey) {
  const config = affirmConfiguration();
  if (!config.configured) throw new Error('Affirm is not configured');
  const authorization = Buffer.from(config.publicKey + ':' + config.privateKey).toString('base64');
  const response = await fetch(config.baseUrl + path, { method: 'POST', headers: { Authorization: 'Basic ' + authorization, 'Content-Type': 'application/json', 'country-code': 'CAN', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(result.message || result.error || 'Affirm request failed'); error.status = response.status; throw error; }
  return result;
}

export function buildAffirmCheckout({ order, items, origin, merchantName }) {
  const config = affirmConfiguration();
  return {
    merchant: { user_confirmation_url: origin + '/checkout/affirm?order_id=' + order.id, user_cancel_url: origin + '/checkout/cancel', user_confirmation_url_action: 'POST', name: merchantName, public_api_key: config.publicKey },
    shipping: { name: { full: order.customerName || 'Customer' }, address: { line1: order.shippingAddressJson?.line1, city: order.shippingAddressJson?.city, state: order.shippingProvince || order.shippingState || '', zipcode: order.shippingAddressJson?.postalCode, country: order.shippingCountry }, email: order.customerEmail },
    items: items.map((item) => ({ display_name: item.product.name, sku: item.product.sku || item.product.id, unit_price: item.product.priceCents, qty: item.quantity, item_url: origin + '/products/' + item.product.slug })),
    metadata: { order_id: order.id },
    order_id: order.id,
    currency: 'CAD',
    total: order.totalCents
  };
}

export async function authorizeAndCaptureAffirm({ checkoutToken, order }) {
  const authorization = await affirmRequest('/api/v1/transactions', { transaction_id: checkoutToken, order_id: order.id, currency: order.currency.toUpperCase(), total: order.totalCents }, 'affirm-authorize-' + order.id);
  if (Number(authorization.amount) !== order.totalCents || String(authorization.currency || '').toLowerCase() !== order.currency.toLowerCase()) throw new Error('Affirm authorization amount or currency mismatch');
  await affirmRequest('/api/v1/transactions/' + encodeURIComponent(authorization.id) + '/capture', { order_id: order.id, amount: order.totalCents }, 'affirm-capture-' + order.id);
  return authorization;
}
