import assert from 'node:assert/strict';
import test from 'node:test';
import { freightOsHealthCompatibility, stripeCredentialDiagnostics } from '../src/services/providerStatus.js';

test('Freight OS compatibility fields project the nested provider response safely', () => {
  const nested = { payments: { stripe: { configured: true } }, crypto: { listener: { configured: false } } };
  assert.deepEqual(freightOsHealthCompatibility(nested), {
    payments: nested.payments,
    blockchain: { listenerConfigured: false }
  });
  assert.deepEqual(freightOsHealthCompatibility(), { payments: {}, blockchain: { listenerConfigured: false } });
});
test('Stripe credential diagnostics classify formats without exposing credentials', () => {
  assert.deepEqual(stripeCredentialDiagnostics('  sk_live_example  '), {
    credentialFormat: 'LIVE_SECRET',
    hasOuterWhitespace: true,
    hasLiteralEscapes: false,
    hasQuotes: false
  });
  assert.equal(stripeCredentialDiagnostics('sk_test_example').credentialFormat, 'TEST_SECRET');
  assert.equal(stripeCredentialDiagnostics('rk_live_example').credentialFormat, 'RESTRICTED_LIVE');
  assert.equal(stripeCredentialDiagnostics('sk\\_live\\_example').hasLiteralEscapes, true);
  assert.equal(stripeCredentialDiagnostics('\"sk_live_example\"').hasQuotes, true);
  assert.equal(stripeCredentialDiagnostics('').credentialFormat, 'MISSING');
});