import test from 'node:test';
import assert from 'node:assert/strict';
import { retryDelayMs } from '../src/services/durableQueue.js';

test('queue retries use bounded exponential backoff', () => {
  assert.equal(retryDelayMs(1), 5000);
  assert.equal(retryDelayMs(2), 10000);
  assert.equal(retryDelayMs(20), 3600000);
});
