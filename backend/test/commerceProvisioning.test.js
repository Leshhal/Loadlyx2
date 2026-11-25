import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { commerceBranding, finishCommerceProvisioning, normalizeBusinessType } from '../src/services/commerceProvisioning.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';

test('signup accepts only the supported business type identifiers', () => {
  assert.equal(normalizeBusinessType(), null);
  assert.equal(normalizeBusinessType(' commerce '), 'COMMERCE');
  assert.equal(normalizeBusinessType('MOVING_SERVICE'), 'MOVING_SERVICE');
  assert.equal(normalizeBusinessType('MARKETPLACE_LOGISTICS'), 'MARKETPLACE_LOGISTICS');
  for (const value of ['moving-supplies', 'SUPER_ADMIN', {}, ['COMMERCE'], false]) {
    assert.throws(() => normalizeBusinessType(value), /supported business type/);
  }
});

test('new commerce profiles enable shared store functions and disable logistics', () => {
  const branding = commerceBranding('Test Beauty Commerce');
  const expectedEnabled = ['storefront', 'products', 'categories', 'inventory', 'orders', 'customers', 'discounts', 'payments', 'ledger', 'analytics', 'domains', 'team', 'notifications', 'shipping', 'tax'];
  for (const capability of expectedEnabled) assert.equal(branding.commerce.entitlements[capability], true, capability);
  for (const capability of ['loadboard', 'truckBoard', 'brokerTools', 'carrierTools', 'driverTools', 'movingQuotes', 'movingServices', 'dispatch', 'moveAndHold', 'quotes', 'marketplace', 'rentals']) {
    assert.equal(branding.commerce.entitlements[capability], false, capability);
  }
  assert.equal(branding.businessType, 'COMMERCE');
  assert.equal(branding.commerce.storefront.status, 'DRAFT');
  assert.equal(branding.commerce.payment.status, 'SETUP_REQUIRED');
  assert.equal(branding.commerce.shipping.status, 'SETUP_REQUIRED');
  assert.equal(branding.commerce.tax.status, 'SETUP_REQUIRED');
  assert.equal(branding.commerce.currency, 'CAD');
  assert.equal(branding.footerHeading, 'Test Beauty Commerce');
  assert.equal(branding.paymentSettings, undefined);
});

test('provisioning returns independent tenant settings without inherited credentials', () => {
  const first = commerceBranding('First');
  const second = commerceBranding('Second');
  first.commerce.entitlements.dispatch = true;
  first.commerce.payment.stripeAccountId = 'acct_other';
  assert.equal(second.commerce.entitlements.dispatch, false);
  assert.equal(second.commerce.payment.stripeAccountId, undefined);
});

test('finishing provisioning records the owner and preserves a configured shipping row on retry', async () => {
  const tenant = { id: 'tenant-a', brandingJson: commerceBranding('Test Beauty Commerce') };
  const owner = { id: 'owner-a', tenantId: tenant.id, role: 'TENANT_ADMIN' };
  const shipping = { enabled: true, flatRateCents: 1500 };
  const tx = {
    tenant: { update: async ({ where, data }) => { assert.equal(where.id, 'tenant-a'); return { ...tenant, ...data }; } },
    tenantShippingConfig: { upsert: async ({ where, create, update }) => {
      assert.deepEqual(where, { tenantId_provider: { tenantId: 'tenant-a', provider: 'MANUAL' } });
      assert.equal(create.enabled, false);
      assert.equal(create.environment, 'SANDBOX');
      Object.assign(shipping, update);
      return shipping;
    } }
  };
  const result = await finishCommerceProvisioning(tx, tenant, owner);
  assert.equal(result.tenant.brandingJson.commerce.ownerUserId, owner.id);
  assert.equal(result.role, 'TENANT_ADMIN');
  assert.deepEqual(shipping, { enabled: true, flatRateCents: 1500 });
});

test('commerce HTTP signup provisions one scoped owner and preserves verification', async (t) => {
  const previousEnv = { nodeEnv: env.nodeEnv, jwtSecret: env.jwtSecret, emailProvider: env.emailProvider };
  Object.assign(env, { nodeEnv: 'test', jwtSecret: 'commerce-test-only', emailProvider: 'disabled' });
  const { default: authRoutes } = await import('../src/routes/auth.js');
  t.after(() => Object.assign(env, previousEnv));
  const created = {};
  function stub(target, key, implementation) {
    const previous = target[key];
    target[key] = implementation;
    t.after(() => { target[key] = previous; });
  }
  stub(prisma.user, 'findUnique', async () => null);
  stub(prisma.tenant, 'findFirst', async () => null);
  stub(prisma.authToken, 'create', async ({ data }) => { created.token = data; return data; });
  stub(prisma.platformEvent, 'upsert', async ({ create }) => create);
  stub(prisma.workflowDefinition, 'findMany', async () => []);
  t.mock.method(console, 'info', () => {});
  const tx = {
    tenant: {
      create: async ({ data }) => { created.tenant = { id: 'new-commerce', ...data }; return created.tenant; },
      update: async ({ data }) => { created.tenant = { ...created.tenant, ...data }; return created.tenant; }
    },
    user: { create: async ({ data }) => { created.owner = { id: 'new-owner', ...data, tenant: created.tenant, emailVerifiedAt: null }; return created.owner; } },
    tenantShippingConfig: { upsert: async ({ create }) => { created.shipping = create; return create; } }
  };
  for (const model of ['commissionPolicy', 'subscription', 'aiTenantConfig', 'simulationConfig', 'auditEvent']) {
    tx[model] = { create: async ({ data }) => { created[model] = data; return data; } };
  }
  stub(prisma, '$transaction', async (callback) => callback(tx));
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/auth/signup`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fullName: 'Test Owner', email: 'owner@example.test', password: 'test-only-password', acceptedTerms: true, tenantSlug: 'test-beauty-commerce', companyName: 'Test Beauty Commerce', businessType: 'COMMERCE' })
  });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.user.role, 'TENANT_ADMIN');
  assert.equal(body.user.tenantId, 'new-commerce');
  assert.equal(body.user.emailVerifiedAt, null);
  assert.equal(body.token, undefined);
  assert.equal(created.tenant.stripePolicy, 'STRIPE_CONNECT');
  assert.equal(created.tenant.stripeEnabled, false);
  assert.equal(created.tenant.paypalEnabled, false);
  assert.equal(created.tenant.brandingJson.commerce.ownerUserId, 'new-owner');
  assert.equal(created.owner.passwordHash.startsWith('$2'), true);
  assert.equal(created.token.type, 'EMAIL_VERIFICATION');
  assert.equal(created.token.userId, 'new-owner');
  assert.equal(created.shipping.tenantId, 'new-commerce');
  assert.equal(created.commissionPolicy.storeCommissionBps, 650);
  assert.equal(created.subscription.monthlyPriceCents, 2900);
  assert.equal(created.subscription.currentPeriodEnd, undefined);
  assert.equal(created.auditEvent.tenantId, 'new-commerce');
  assert.equal(created.auditEvent.afterJson.businessType, 'COMMERCE');

  async function signup(overrides) {
    const result = await fetch(`http://127.0.0.1:${server.address().port}/auth/signup`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fullName: 'Test Owner', email: 'owner@example.test', password: 'test-only-password', acceptedTerms: true, tenantSlug: 'test-beauty-commerce', companyName: 'Test Beauty Commerce', ...overrides })
    });
    return { status: result.status, body: await result.json() };
  }

  await t.test('public signup cannot supply arbitrary tenant types or privileged roles', async () => {
    assert.equal((await signup({ businessType: 'SUPER_ADMIN' })).status, 400);
    assert.equal((await signup({ businessType: 'COMMERCE', role: 'SUPER_ADMIN' })).status, 400);
    assert.equal((await signup({ businessType: 'COMMERCE', role: 'MARKETPLACE_USER', tenantSlug: null })).status, 400);
    assert.equal((await signup({ businessType: 'COMMERCE', tenantSlug: 'admin' })).status, 400);
  });

  await t.test('legacy tenant signup does not receive a commerce profile', async () => {
    const result = await signup({});
    assert.equal(result.status, 201);
    assert.deepEqual(created.tenant.brandingJson, { theme: 'default', tenantPages: [] });
    assert.equal(created.tenant.stripePolicy, undefined);
  });

  await t.test('noncommerce business selections preserve the legacy provisioned modules', async () => {
    const result = await signup({ businessType: 'MOVING_SERVICE' });
    assert.equal(result.status, 201);
    assert.equal(created.tenant.brandingJson.businessType, 'MOVING_SERVICE');
    assert.equal(created.tenant.brandingJson.commerce, undefined);
  });

  await t.test('a concurrent uniqueness conflict reports a recoverable conflict', async () => {
    tx.tenant.create = async () => { throw Object.assign(new Error('unique conflict'), { code: 'P2002' }); };
    t.mock.method(console, 'error', () => {});
    const result = await signup({ businessType: 'COMMERCE' });
    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'SIGNUP_CONFLICT');
  });
});

test('shipping provisioning failures propagate so the signup transaction rolls back', async () => {
  const tenant = { id: 'tenant-a', brandingJson: commerceBranding('Test Beauty Commerce') };
  await assert.rejects(finishCommerceProvisioning({
    tenant: { update: async () => tenant },
    tenantShippingConfig: { upsert: async () => { throw new Error('shipping write failed'); } }
  }, tenant, { id: 'owner-a' }), /shipping write failed/);
});
