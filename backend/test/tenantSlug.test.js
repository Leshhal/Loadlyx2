import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTenantSlug, validateTenantSlug } from '../src/lib/tenantSlug.js';

test('normalizes a tenant name into a DNS-safe slug', () => {
  assert.equal(normalizeTenantSlug('  North Star Moving!  '), 'north-star-moving');
});

test('rejects reserved tenant slugs', () => {
  assert.deepEqual(validateTenantSlug('Admin'), {
    ok: false,
    slug: 'admin',
    error: 'Tenant slug is reserved'
  });
});

test('accepts a valid tenant slug', () => {
  assert.deepEqual(validateTenantSlug('Cansask Moving'), {
    ok: true,
    slug: 'cansask-moving'
  });
});
