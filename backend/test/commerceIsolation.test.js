import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { once } from 'node:events';

process.env.JWT_SECRET ||= 'commerce-isolation-test-secret-only';
const { prisma } = await import('../src/db/prisma.js');
const { default: adminRoutes } = await import('../src/routes/admin.js');
const { default: productRoutes } = await import('../src/routes/products.js');
const { default: shippingRoutes } = await import('../src/routes/shipping.js');
const { requireCommerceCapability, requirePublishedStorefront } = await import('../src/middleware/commerceAccess.js');
const { requireEntitlement } = await import('../src/middleware/requireEntitlement.js');
const { commerceReadiness } = await import('../src/services/commerceReadiness.js');
const { tenantProfile } = await import('../src/services/commerceAccess.js');

test('commerce API boundaries enforce authenticated tenant, publication, roles and protected settings', async (t) => {
  const originals = [];
  function stub(model, method, implementation) {
    originals.push([model, method, model[method]]);
    model[method] = implementation;
  }
  let actorRole = 'TENANT_ADMIN';
  let writes = 0;
  let capturedSettings;
  let productWhere;
  const tenantA = { id: 'tenant-a', slug: 'beauty-a', subdomain: 'beauty-a', name: 'Test Beauty Commerce', isActive: true, primaryDomain: null, brandingJson: {
    businessType: 'COMMERCE', commerce: { version: 1, ownerUserId: 'owner-a', entitlements: { products: true, orders: true, marketplace: false }, storefront: { status: 'DRAFT' } }, paymentSettings: { stripeAccountId: 'acct_preserve' }
  } };
  stub(prisma.user, 'findUnique', async () => ({ id: 'owner-a', role: actorRole, tenantId: tenantA.id, isActive: true, emailVerifiedAt: new Date(), tenant: { isActive: true } }));
  stub(prisma.securityBlock, 'findFirst', async () => null);
  stub(prisma.tenant, 'findUnique', async ({ where }) => where.id === tenantA.id ? tenantA : { id: 'tenant-b', brandingJson: {} });
  stub(prisma.tenant, 'findFirst', async () => ({ id: 'tenant-b', brandingJson: {} }));
  stub(prisma.tenant, 'update', async ({ data }) => { writes++; capturedSettings = data; return { ...tenantA, ...data }; });
  stub(prisma.product, 'findMany', async ({ where }) => { productWhere = where; return []; });
  stub(prisma.product, 'count', async () => 1);
  stub(prisma.category, 'findFirst', async () => null);
  stub(prisma.subscriptionPlan, 'findUnique', async () => ({ entitlementsJson: { marketplace: true, products: true } }));
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { if (req.headers['x-test-store'] === 'a') req.tenant = tenantA; next(); });
  app.use('/admin', adminRoutes);
  app.use('/products', productRoutes);
  app.use('/shipping', shippingRoutes);
  app.get('/logistics', ...requireCommerceCapability('marketplace'), (_req, res) => res.json({ allowed: true }));
  app.get('/published', requirePublishedStorefront, (_req, res) => res.json({ allowed: true }));
  app.get('/upgrade', ...requireCommerceCapability('orders'), requireEntitlement('marketplace'), (_req, res) => res.json({ allowed: true }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = jwt.sign({ userId: 'owner-a', tokenType: 'access' }, process.env.JWT_SECRET);
  async function request(path, { authenticated = true, ...options } = {}) {
    return fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  }
  try {
    await t.test('tenant-ID tampering cannot read or update another tenant', async () => {
      assert.equal((await request('/admin/tenant/tenant-b')).status, 403);
      assert.equal((await request('/admin/tenant/tenant-b', { method: 'PUT', body: '{}' })).status, 403);
      assert.equal((await request('/admin/tenant/subdomain/beauty-b')).status, 403);
      assert.equal(writes, 0);
    });
    await t.test('branding edits preserve payment and commerce policy and reject domain claims', async () => {
      const response = await request('/admin/tenant-settings', { method: 'PUT', body: JSON.stringify({ name: tenantA.name, subdomain: tenantA.subdomain, branding: { heroTitle: 'Beauty store', commerce: { entitlements: { marketplace: true } }, paymentSettings: { stripeAccountId: 'acct_attacker' } } }) });
      assert.equal(response.status, 200);
      assert.deepEqual(capturedSettings.brandingJson.commerce, tenantA.brandingJson.commerce);
      assert.equal(capturedSettings.brandingJson.paymentSettings.stripeAccountId, 'acct_preserve');
      assert.equal(capturedSettings.brandingJson.heroTitle, 'Beauty store');
      const domain = await request('/admin/tenant-settings', { method: 'PUT', body: JSON.stringify({ name: tenantA.name, subdomain: tenantA.subdomain, primaryDomain: 'victim.example' }) });
      assert.equal(domain.status, 409);
    });
    await t.test('public catalog requires tenant and hides draft storefronts', async () => {
      assert.equal((await request('/products', { authenticated: false })).status, 400);
      assert.equal((await request('/products', { authenticated: false, headers: { 'x-test-store': 'a' } })).status, 404);
      assert.equal((await request('/products/slug/concealer', { authenticated: false, headers: { 'x-test-store': 'a' } })).status, 404);
      assert.equal((await request('/published', { authenticated: false, headers: { 'x-test-store': 'a' } })).status, 404);
      assert.equal((await request('/products')).status, 200);
      assert.equal(productWhere.tenantId, tenantA.id);
    });
    await t.test('published catalog filters drafts and archived products', async () => {
      tenantA.brandingJson.commerce.storefront.status = 'LIVE';
      assert.equal((await request('/products', { authenticated: false, headers: { 'x-test-store': 'a' } })).status, 200);
      assert.deepEqual(productWhere, { tenantId: tenantA.id, publicationStatus: 'ACTIVE', isActive: true });
      tenantA.brandingJson.commerce.storefront.status = 'DRAFT';
    });
    await t.test('business capabilities block logistics despite a plan upgrade or absent header', async () => {
      assert.equal((await request('/logistics')).status, 403);
      assert.equal((await request('/upgrade')).status, 403);
      assert.equal((await request('/logistics', { authenticated: false, headers: { 'x-test-store': 'a' } })).status, 403);
    });
    await t.test('staff cannot mutate the product catalog', async () => {
      actorRole = 'TENANT_STAFF';
      assert.equal((await request('/products', { method: 'POST', body: '{}' })).status, 403);
      assert.equal((await request('/products/foreign-product', { method: 'PUT', body: '{}' })).status, 403);
      assert.equal((await request('/products/foreign-product', { method: 'DELETE' })).status, 403);
      actorRole = 'TENANT_ADMIN';
    });
    await t.test('cross-tenant category references fail before product persistence', async () => {
      const response = await request('/products', { method: 'POST', body: JSON.stringify({ name: 'Concealer', slug: 'concealer', priceCents: 2500, weightKg: 0.1, categoryId: 'foreign-category' }) });
      assert.equal(response.status, 400);
    });
    await t.test('client tenant IDs cannot select another tenant shipping configuration', async () => {
      const response = await request('/shipping/quote', { authenticated: false, method: 'POST', body: JSON.stringify({ tenantId: 'tenant-b', originPostalCode: 'S7K', destinationPostalCode: 'M5V', packages: [{ weightKg: 1, lengthCm: 10, widthCm: 10, heightCm: 10 }] }) });
      assert.equal(response.status, 400);
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    for (const [model, method, original] of originals.reverse()) model[method] = original;
  }
});

test('readiness does not declare provider or infrastructure success from settings alone', () => {
  const tenant = { name: 'Test Beauty Commerce', brandingJson: { businessType: 'COMMERCE', logoUrl: '/logo.png', contactEmail: 'owner@example.test', commerce: { ownerUserId: 'owner', storefront: { status: 'DRAFT' } }, paymentSettings: { stripeAccountId: 'acct_unverified', stripeChargesEnabled: true } } };
  const result = commerceReadiness(tenant, 1);
  assert.equal(result.ready, false);
  assert.equal(result.checklist.find((step) => step.key === 'products').complete, true);
  assert.equal(result.checklist.find((step) => step.key === 'payments').complete, false);
  assert.equal(result.checklist.find((step) => step.key === 'publish').complete, false);
  assert.equal(JSON.stringify(tenantProfile(tenant)).includes('acct_unverified'), false);
});
