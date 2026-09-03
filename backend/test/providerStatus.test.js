import assert from 'node:assert/strict';
import test from 'node:test';
import { freightOsHealthCompatibility } from '../src/services/providerStatus.js';

test('Freight OS compatibility fields project the nested provider response safely', () => {
  const nested = { payments: { stripe: { configured: true } }, crypto: { listener: { configured: false } } };
  assert.deepEqual(freightOsHealthCompatibility(nested), {
    payments: nested.payments,
    blockchain: { listenerConfigured: false }
  });
  assert.deepEqual(freightOsHealthCompatibility(), { payments: {}, blockchain: { listenerConfigured: false } });
});
