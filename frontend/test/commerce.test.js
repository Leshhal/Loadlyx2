import test from 'node:test';
import assert from 'node:assert/strict';
import { BUSINESS_TYPES, signupPayload, commerceNavigation, commercePathAllowed, productClassification } from '../lib/commerce.js';

const storeOwner = {
  role: 'TENANT_ADMIN',
  tenantProfile: {
    businessType: 'COMMERCE',
    commerce: { version: 1, entitlements: { products: true, orders: true, customers: true, ledger: true, payments: true } }
  }
};

test('business signup sends the selected server-supported business type and omits password confirmation', () => {
  for (const [businessType] of BUSINESS_TYPES) {
    const payload = signupPayload({ role: 'TENANT_ADMIN', tenantSlug: 'test-beauty', businessType, passwordConfirmation: 'confirmation' });
    assert.equal(payload.businessType, businessType);
    assert.equal(payload.tenantSlug, 'test-beauty');
    assert.equal(Object.hasOwn(payload, 'passwordConfirmation'), false);
  }
});

test('switching from business owner to a marketplace role removes stale business type and tenant selection', () => {
  for (const role of ['MARKETPLACE_USER', 'BROKER', 'CARRIER']) {
    const payload = signupPayload({ role, businessType: 'COMMERCE', tenantSlug: 'previous-store' });
    assert.equal(payload.businessType, undefined);
    assert.equal(payload.tenantSlug, undefined);
  }
});

test('commerce navigation retains shared finance and customer tools and excludes logistics and platform routes', () => {
  const routes = commerceNavigation(storeOwner).map(([, href]) => href);
  for (const route of ['/admin/manage/orders', '/app/products', '/admin/customers', '/admin/balance', '/admin/payments']) {
    assert.ok(routes.includes(route), route);
  }
  for (const route of ['/app/connect', '/app/dispatch', '/admin/manage/quotes', '/admin/manage/loads', '/admin/platform', '/admin/finance']) {
    assert.equal(commercePathAllowed(storeOwner, route), false, route);
  }
  assert.equal(commercePathAllowed(storeOwner, '/admin/manage/orders/order-a'), true);
  assert.equal(commercePathAllowed(storeOwner, '/admin/manage/orders-foreign'), false);
});

test('commerce navigation requires explicit capability values and preserves existing tenant navigation fallback', () => {
  assert.equal(commercePathAllowed(storeOwner, '/admin/manage/categories'), false);
  assert.equal(commerceNavigation({ tenantSlug: 'moving-supplies' }), null);
  assert.equal(commerceNavigation({ tenantProfile: { businessType: 'MOVING_SERVICE' } }), null);
  assert.equal(commercePathAllowed({ tenantProfile: { businessType: 'TOTE_RENTAL' } }, '/app/connect'), true);
  const incomplete = { tenantProfile: { businessType: 'COMMERCE', commerce: { version: 1, entitlements: { products: 'true' } } } };
  assert.equal(commercePathAllowed(incomplete, '/app/products'), false);
  const missingProfile = { tenantProfile: { businessType: 'COMMERCE' } };
  assert.equal(commercePathAllowed(missingProfile, '/app/connect'), false);
  assert.equal(commercePathAllowed(missingProfile, '/app/products'), false);
});

test('generic commerce products are not automatically classified as moving supplies', () => {
  assert.deepEqual(productClassification(storeOwner), { isMovingSupply: false, isFurniture: false });
  assert.deepEqual(productClassification({ tenantSlug: 'moving-supplies' }), { isMovingSupply: true, isFurniture: false });
});
