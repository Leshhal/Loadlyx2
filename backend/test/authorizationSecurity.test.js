import test from 'node:test';
import assert from 'node:assert/strict';

import { requirePlatformFinance, requirePlatformWrite } from '../src/middleware/requireauth.js';

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
