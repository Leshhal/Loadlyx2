import test from 'node:test';
import assert from 'node:assert/strict';

import { requireVerifiedOAuthIdentity } from '../src/services/oauthService.js';

test('OAuth account creation or linking requires a provider-verified email', () => {
  assert.throws(
    () => requireVerifiedOAuthIdentity({ email: 'victim@example.com', emailVerified: false }),
    /verified email address/
  );
  assert.throws(
    () => requireVerifiedOAuthIdentity({ email: null, emailVerified: true }),
    /verified email address/
  );
});

test('OAuth accepts an explicitly verified provider email', () => {
  const profile = { email: 'member@example.com', emailVerified: true };
  assert.equal(requireVerifiedOAuthIdentity(profile), profile);
});
