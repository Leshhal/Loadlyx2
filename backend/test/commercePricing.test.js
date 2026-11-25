import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { COMMERCE_PLANS, SUBSCRIPTION_PLANS, getCommercePlan } from '../src/config/plans.js';

process.env.JWT_SECRET ||= 'commerce-pricing-test-secret-only';
process.env.STRIPE_SECRET_KEY = 'sk_test_commerce_pricing_fixture';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_commerce_pricing_fixture';

test('commerce monthly prices use approved CAD amounts and retain commission basis points', () => {
  assert.deepEqual(Object.values(COMMERCE_PLANS).map((plan) => plan.monthlyPriceCents), [2900, 5900, 9900]);
  assert.deepEqual(Object.values(COMMERCE_PLANS).map((plan) => plan.commissionBps), [650, 550, 300]);
  assert.equal(getCommercePlan('growth').currency, 'cad');
  assert.equal(getCommercePlan('unknown'), null);
  assert.equal(SUBSCRIPTION_PLANS.STARTER.monthlyPriceCents, 9900);
});

test('trial enrollment stays blocked at the real HTTP route until onboarding is verified', async () => {
  const { prisma } = await import('../src/db/prisma.js');
  const { default: financeRoutes } = await import('../src/routes/finance.js');
  const originals = [prisma.user.findUnique, prisma.securityBlock.findFirst, prisma.tenant.findUnique];
  const tenant = { id: 'tenant-commerce', isActive: true, isDemo: false, brandingJson: { businessType: 'COMMERCE', commerce: { entitlements: {}, storefront: { status: 'DRAFT' } } } };
  prisma.user.findUnique = async () => ({ id: 'owner', tenantId: tenant.id, role: 'TENANT_ADMIN', isActive: true, emailVerifiedAt: new Date(), tenant: { isActive: true } });
  prisma.securityBlock.findFirst = async () => null;
  prisma.tenant.findUnique = async () => tenant;
  const app = express();
  app.use(express.json());
  app.use('/finance', financeRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const token = jwt.sign({ userId: 'owner', tokenType: 'access' }, process.env.JWT_SECRET);
    const response = await fetch(`http://127.0.0.1:${server.address().port}/finance/subscription/checkout`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}`, 'idempotency-key': 'request_test_12345' }, body: JSON.stringify({ planCode: 'STARTER', monthlyPriceCents: 1 }) });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, 'COMMERCE_ONBOARDING_NOT_READY');
  } finally {
    [prisma.user.findUnique, prisma.securityBlock.findFirst, prisma.tenant.findUnique] = originals;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('public commerce plan route returns approved prices even with legacy stored plans', async () => {
  const { prisma } = await import('../src/db/prisma.js');
  const { default: financeRoutes } = await import('../src/routes/finance.js');
  const original = prisma.subscriptionPlan.findMany;
  prisma.subscriptionPlan.findMany = async () => [{ code: 'STARTER', monthlyPriceCents: 9900, featuresJson: ['Quotes'] }];
  const app = express();
  app.use('/finance', financeRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const commerce = await (await fetch(`${base}/finance/plans?businessType=COMMERCE`)).json();
    assert.deepEqual(commerce.plans.map((plan) => plan.monthlyPriceCents), [2900, 5900, 9900]);
    assert.equal(commerce.interval, 'month');
    const legacy = await (await fetch(`${base}/finance/plans`)).json();
    assert.equal(legacy.plans[0].monthlyPriceCents, 9900);
  } finally {
    prisma.subscriptionPlan.findMany = original;
    await new Promise((resolve) => server.close(resolve));
  }
});
