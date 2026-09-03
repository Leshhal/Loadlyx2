import test from 'node:test';
import assert from 'node:assert/strict';
import { paypalAvailability, stripeAvailability } from '../src/services/tenantPaymentPolicy.js';

test('only an explicitly authorized and enabled tenant can use platform Stripe', () => {
  const allowed = { stripePolicy: 'PLATFORM_STRIPE_ALLOWED', stripeEnabled: true, isDemo: false };
  assert.deepEqual(stripeAvailability(allowed, 'sk_live_example'), { available: true, enabled: true, status: 'LIVE', mode: 'LIVE' });
  assert.equal(stripeAvailability({ ...allowed, stripePolicy: 'DISABLED' }, 'sk_live_example').available, false);
  assert.equal(stripeAvailability({ ...allowed, stripeEnabled: false }, 'sk_live_example').available, false);
});

test('demo and unconfigured tenants fail closed for real payment methods', () => {
  const demo = { stripePolicy: 'PLATFORM_STRIPE_ALLOWED', stripeEnabled: true, paypalEnabled: true, isDemo: true };
  assert.equal(stripeAvailability(demo, 'sk_live_example').status, 'DISABLED');
  assert.equal(paypalAvailability(demo, { configured: true, mode: 'LIVE', merchantId: 'merchant' }).status, 'DISABLED');
  assert.equal(stripeAvailability({ stripePolicy: 'PLATFORM_STRIPE_ALLOWED', stripeEnabled: true }, '').status, 'CONFIGURATION REQUIRED');
});

test('PayPal requires tenant enablement, provider credentials, and merchant identity', () => {
  const tenant = { paypalEnabled: true, isDemo: false };
  assert.equal(paypalAvailability(tenant, { configured: true, mode: 'SANDBOX', merchantId: 'merchant' }).available, true);
  assert.equal(paypalAvailability(tenant, { configured: false, merchantId: 'merchant' }).status, 'CONFIGURATION REQUIRED');
  assert.equal(paypalAvailability({ ...tenant, paypalEnabled: false }, { configured: true, merchantId: 'merchant' }).status, 'DISABLED');
});
