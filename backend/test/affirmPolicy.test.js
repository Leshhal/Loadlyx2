import test from 'node:test';
import assert from 'node:assert/strict';
import { affirmAvailability } from '../src/services/affirmService.js';

const configured = { configured: true, environment: 'SANDBOX', publicKey: 'public', scriptUrl: 'https://cdn1-sandbox.affirm.com/js/v2/affirm.js' };

test('Affirm is isolated to the immutable Moving Supplies tenant id', () => {
  assert.equal(affirmAvailability({ id: 'tenant-moving-supplies', isDemo: false }, { affirmEnabled: true }, configured).status, 'SANDBOX READY');
  assert.equal(affirmAvailability({ id: 'tenant-cansask', isDemo: false }, { affirmEnabled: true }, configured).available, false);
  assert.equal(affirmAvailability({ id: 'tenant-moving-supplies', isDemo: true }, { affirmEnabled: true }, configured).available, false);
});

test('Affirm reports truthful configuration states', () => {
  assert.equal(affirmAvailability({ id: 'tenant-moving-supplies', isDemo: false }, { affirmEnabled: true }, { configured: false, environment: 'SANDBOX' }).status, 'NOT CONFIGURED');
  assert.equal(affirmAvailability({ id: 'tenant-moving-supplies', isDemo: false }, { affirmEnabled: true }, { ...configured, environment: 'LIVE' }).status, 'PRODUCTION CONFIGURED');
  assert.equal(affirmAvailability({ id: 'tenant-moving-supplies', isDemo: false }, { affirmEnabled: true }, { ...configured, environment: 'LIVE' }).liveVerified, false);
});
