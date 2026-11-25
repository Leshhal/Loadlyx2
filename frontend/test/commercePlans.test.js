import test from 'node:test';
import assert from 'node:assert/strict';
import { COMMERCE_PLANS, commerceSignupSelection } from '../lib/commercePlans.js';
import { signupPayload, commercePathAllowed } from '../lib/commerce.js';

test('commerce monthly offers use the approved CAD amounts', () => {
  assert.deepEqual(COMMERCE_PLANS.map((plan) => [plan.code, plan.monthlyPriceCents]), [
    ['STARTER', 2900], ['GROWTH', 5900], ['PROFESSIONAL', 9900]
  ]);
});

test('pricing signup links select a business owner commerce account and preserve the selected plan', () => {
  for (const plan of COMMERCE_PLANS) {
    const selection = commerceSignupSelection(`?businessType=COMMERCE&plan=${plan.code.toLowerCase()}`);
    assert.deepEqual(selection, { role: 'TENANT_ADMIN', businessType: 'COMMERCE', planCode: plan.code });
    assert.equal(signupPayload({ ...selection, tenantSlug: 'test-store' }).planCode, plan.code);
  }
  assert.deepEqual(commerceSignupSelection('?businessType=COMMERCE&plan=unknown'), { role: 'TENANT_ADMIN', businessType: 'COMMERCE', planCode: 'STARTER' });
  assert.deepEqual(commerceSignupSelection(''), {});
});

test('marketplace signup drops stale commerce plan selection', () => {
  assert.equal(signupPayload({ role: 'CARRIER', businessType: 'COMMERCE', planCode: 'PROFESSIONAL' }).planCode, undefined);
  assert.equal(signupPayload({ role: 'TENANT_ADMIN', businessType: 'MOVING_SERVICE', planCode: 'PROFESSIONAL' }).planCode, undefined);
});

test('commerce owners can reach their subscription settings through the permission guard', () => {
  const owner = { tenantProfile: { businessType: 'COMMERCE', commerce: { version: 1, entitlements: { payments: true } } } };
  assert.equal(commercePathAllowed(owner, '/admin/billing'), true);
  assert.equal(commercePathAllowed(owner, '/admin/billing-foreign'), false);
});
