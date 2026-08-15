import test from 'node:test';
import assert from 'node:assert/strict';

import { accountAccessFailure, requirePlatformFinance, requirePlatformWrite } from '../src/middleware/requireauth.js';

test('protected APIs reject unverified and suspended accounts with explicit reasons', () => {
  assert.deepEqual(accountAccessFailure({ isActive: true, emailVerifiedAt: null, tenant: null }), { status: 403, body: { error: 'Please verify your email before continuing.', code: 'EMAIL_VERIFICATION_REQUIRED' } });
  assert.equal(accountAccessFailure({ isActive: true, emailVerifiedAt: new Date(), tenant: { isActive: true } }), null);
  assert.equal(accountAccessFailure({ isActive: false, emailVerifiedAt: new Date(), tenant: null }).status, 401);
  assert.equal(accountAccessFailure({ isActive: true, emailVerifiedAt: new Date(), tenant: { isActive: false } }).status, 401);
});

function invoke(middleware, role) {
  let statusCode = 200;
  let body = null;
  let continued = false;
  middleware(
    { user: role ? { role } : null },
    { status(code) { statusCode = code; return this; }, json(value) { body = value; return this; } },
    () => { continued = true; }
  );
  return { statusCode, body, continued };
}

test('support is read-only for platform mutations', () => {
  assert.equal(invoke(requirePlatformWrite, 'SUPPORT').statusCode, 403);
  assert.equal(invoke(requirePlatformWrite, 'ADMIN').continued, true);
});

test('financial mutations require platform owner authority', () => {
  assert.equal(invoke(requirePlatformFinance, 'SUPPORT').statusCode, 403);
  assert.equal(invoke(requirePlatformFinance, 'ADMIN').statusCode, 403);
  assert.equal(invoke(requirePlatformFinance, 'PLATFORM_ADMIN').continued, true);
  assert.equal(invoke(requirePlatformFinance, 'SUPER_ADMIN').continued, true);
});
