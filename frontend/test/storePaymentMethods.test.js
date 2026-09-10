import test from 'node:test';
import assert from 'node:assert/strict';
import { storefrontPaymentMethodState } from '../lib/storePaymentMethods.js';

test('card and PayPal reflect server-authoritative live, test, configured, or sandbox states', () => {
  assert.equal(storefrontPaymentMethodState({ card: { status: 'CONFIGURED' } }, 'card').enabled, true);
  assert.equal(storefrontPaymentMethodState({ card: { status: 'LIVE' } }, 'card').enabled, true);
  assert.equal(storefrontPaymentMethodState({ card: { status: 'TEST' } }, 'card').enabled, true);
  assert.equal(storefrontPaymentMethodState({ card: { status: 'DISABLED' } }, 'card').enabled, false);
  assert.equal(storefrontPaymentMethodState({ paypal: { status: 'SANDBOX' } }, 'paypal').enabled, true);
  assert.equal(storefrontPaymentMethodState({ paypal: { status: 'CONFIGURATION REQUIRED' } }, 'paypal').enabled, false);
});

test('crypto exposes only verified ADA and SOL choices and rejects mock mode', () => {
  const configured = storefrontPaymentMethodState({ crypto: { status: 'CONFIGURED', acceptedAssets: ['BTC', 'ADA', 'SOL'] } }, 'crypto');
  assert.deepEqual(configured.assets, ['ADA', 'SOL']);
  assert.equal(configured.enabled, true);
  assert.equal(storefrontPaymentMethodState({ crypto: { status: 'MOCK', acceptedAssets: ['ADA', 'SOL'] } }, 'crypto').enabled, false);
  assert.equal(storefrontPaymentMethodState({ crypto: { status: 'EXTERNAL_VERIFICATION_REQUIRED', acceptedAssets: ['ADA'] } }, 'crypto').enabled, false);
});