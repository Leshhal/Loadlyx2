import test from 'node:test';
import assert from 'node:assert/strict';
import { readCookie, refreshCookieOptions } from '../src/lib/authCookies.js';

test('refresh cookie is HTTP-only and scoped to auth endpoints', () => {
  const options = refreshCookieOptions();
  assert.equal(options.httpOnly, true);
  assert.equal(options.path, '/api/auth');
  assert.ok(options.maxAge > 0);
});

test('refresh cookie parser reads encoded values without accepting partial names', () => {
  const req = { headers: { cookie: 'theme=dark; loadlyx_refresh=abc%20123; xloadlyx_refresh=nope' } };
  assert.equal(readCookie(req), 'abc 123');
  assert.equal(readCookie({ headers: { cookie: 'xloadlyx_refresh=nope' } }), null);
});
