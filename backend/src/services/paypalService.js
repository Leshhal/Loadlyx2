import crypto from 'crypto';

function configuration() {
  const mode = String(process.env.PAYPAL_MODE || 'SANDBOX').toUpperCase();
  return {
    mode,
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
    partnerAttributionId: process.env.PAYPAL_PARTNER_ATTRIBUTION_ID || '',
    baseUrl: mode === 'LIVE' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
  };
}

export function paypalReadiness() {
  const config = configuration();
  const missing = ['clientId', 'clientSecret'].filter((key) => !config[key]);
  return { configured: missing.length === 0, webhookConfigured: Boolean(config.webhookId), mode: config.mode, missing };
}

async function accessToken() {
  const config = configuration();
  if (!config.clientId || !config.clientSecret) throw new Error('PayPal is not configured');
  const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) throw new Error(`PayPal authentication failed (${response.status})`);
  return { token: body.access_token, config };
}

async function request(path, { method = 'GET', body, idempotencyKey } = {}) {
  const { token, config } = await accessToken();
  const response = await fetch(`${config.baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'PayPal-Request-Id': idempotencyKey } : {}), ...(config.partnerAttributionId ? { 'PayPal-Partner-Attribution-Id': config.partnerAttributionId } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.details?.[0]?.description || `PayPal returned ${response.status}`);
  return payload;
}

export async function createPaypalOrder({ orderId, totalCents, currency, returnUrl, cancelUrl, payeeMerchantId }) {
  const value = (totalCents / 100).toFixed(2);
  return request('/v2/checkout/orders', { method: 'POST', idempotencyKey: `loadlyx-order-${orderId}`, body: { intent: 'CAPTURE', purchase_units: [{ reference_id: orderId, custom_id: orderId, amount: { currency_code: currency.toUpperCase(), value }, ...(payeeMerchantId ? { payee: { merchant_id: payeeMerchantId } } : {}) }], application_context: { return_url: returnUrl, cancel_url: cancelUrl, user_action: 'PAY_NOW', shipping_preference: 'GET_FROM_FILE' } } });
}

export function capturePaypalOrder(providerOrderId, orderId) { return request(`/v2/checkout/orders/${encodeURIComponent(providerOrderId)}/capture`, { method: 'POST', idempotencyKey: `loadlyx-capture-${orderId}` }); }
export function refundPaypalCapture(captureId, amountCents, currency, requestId) { return request(`/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, { method: 'POST', idempotencyKey: requestId, body: { amount: { value: (amountCents / 100).toFixed(2), currency_code: currency.toUpperCase() } } }); }

export async function verifyPaypalWebhook(headers, event) {
  const { token, config } = await accessToken();
  if (!config.webhookId) return false;
  const response = await fetch(`${config.baseUrl}/v1/notifications/verify-webhook-signature`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ auth_algo: headers['paypal-auth-algo'], cert_url: headers['paypal-cert-url'], transmission_id: headers['paypal-transmission-id'], transmission_sig: headers['paypal-transmission-sig'], transmission_time: headers['paypal-transmission-time'], webhook_id: config.webhookId, webhook_event: event }) });
  const body = await response.json().catch(() => ({}));
  return response.ok && body.verification_status === 'SUCCESS';
}

export function paypalPayloadHash(payload) { return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'); }
