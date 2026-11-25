import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { checkoutConfirmationHandler, legacyCheckoutHandler, validateStripeStoreSession } from '../src/services/commerceCheckoutPolicy.js';

// These routes run against in-memory collaborators and a signed fixture event.
// Override provider settings before importing route modules to prevent live I/O.
process.env.JWT_SECRET = 'commerce-checkout-test-only-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_commerce_fixture';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_commerce_fixture';

async function withServer(app, work) {
  const server = await new Promise((resolve) => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
  try { await work(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

const order = { id: 'order-a', tenantId: 'tenant-a', stripeCheckoutSessionId: 'cs_a', totalCents: 1000, currency: 'cad', tenant: { isDemo: false, isActive: true } };
const session = { id: 'cs_a', mode: 'payment', payment_status: 'paid', amount_total: 1000, currency: 'cad', metadata: { tenantId: 'tenant-a', orderId: 'order-a', commissionBps: '650' } };

test('Stripe settlement requires paid status and exact order, tenant, session, amount, and currency', () => {
  assert.equal(validateStripeStoreSession(order, session), true);
  for (const changed of [
    { payment_status: 'unpaid' }, { mode: 'setup' }, { id: 'cs_other' },
    { amount_total: 999 }, { amount_total: undefined }, { currency: 'usd' },
    { metadata: { ...session.metadata, tenantId: 'tenant-b' } },
    { metadata: { ...session.metadata, orderId: 'order-b' } },
    { metadata: { ...session.metadata, commissionBps: '-1' } },
    { metadata: { ...session.metadata, commissionBps: '10001' } }
  ]) assert.equal(validateStripeStoreSession(order, { ...session, ...changed }), false, JSON.stringify(changed));
  assert.equal(validateStripeStoreSession({ ...order, tenant: { isDemo: true } }, session), false);
  assert.equal(validateStripeStoreSession({ ...order, tenant: { isActive: false } }, session), false);
  assert.equal(validateStripeStoreSession({ ...order, stripeCheckoutSessionId: null }, session), false);
  assert.equal(validateStripeStoreSession(null, session), false);
});

test('cross-tenant checkout session returns 404 without requesting provider PII', async () => {
  let providerReads = 0;
  const db = { order: { findFirst: async ({ where }) => {
    assert.equal(where.tenantId, 'tenant-b');
    assert.equal(where.stripeCheckoutSessionId, 'cs_a');
    return null;
  } } };
  const stripeClient = { checkout: { sessions: { retrieve: async () => { providerReads += 1; return { ...session, customer_email: 'private@example.com' }; } } } };
  const app = express();
  app.use((req, _res, next) => { req.tenant = { id: 'tenant-b' }; next(); });
  app.get('/confirmation/:sessionId', checkoutConfirmationHandler({ db, stripeClient }));
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/confirmation/cs_a`);
    assert.equal(response.status, 404);
    assert.equal((await response.text()).includes('private@example.com'), false);
    assert.equal(providerReads, 0);
  });
});

test('checkout confirmation returns only a matching tenant order and rejects mismatched provider metadata', async () => {
  let providerSession = { ...session, customer_email: 'buyer@example.com' };
  const app = express();
  app.use((req, _res, next) => { req.tenant = { id: 'tenant-a' }; next(); });
  app.get('/confirmation/:sessionId', checkoutConfirmationHandler({
    db: { order: { findFirst: async () => order } },
    stripeClient: { checkout: { sessions: { retrieve: async () => providerSession } } }
  }));
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/confirmation/cs_a`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).order.id, order.id);
    providerSession = { ...providerSession, metadata: { ...session.metadata, tenantId: 'tenant-b' } };
    const mismatch = await fetch(`${base}/confirmation/cs_a`);
    assert.equal(mismatch.status, 409);
    assert.equal((await mismatch.text()).includes('buyer@example.com'), false);
  });
});

test('legacy checkout forwards a tenant-scoped product and server checkout ignores caller totals', async () => {
  let forwarded;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.tenant = { id: 'tenant-a' }; next(); });
  app.post('/create-session', legacyCheckoutHandler({
    db: { product: { findFirst: async ({ where }) => {
      assert.deepEqual(where, { tenantId: 'tenant-a', slug: 'cream', isActive: true, publicationStatus: 'ACTIVE' });
      return { id: 'product-a' };
    } } },
    handleCheckout: (req, res) => { forwarded = { body: req.body, path: req.path }; return res.status(201).json({ checkoutUrl: 'https://checkout.example/session' }); }
  }));
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/create-session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productSlug: 'cream', quantity: 2, email: 'buyer@example.com', name: 'Buyer', tenantId: 'tenant-b', totalCents: 1, paymentMethod: 'PAYPAL' }) });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).url, 'https://checkout.example/session');
    assert.equal(forwarded.path, '/checkout');
    assert.deepEqual(forwarded.body.items, [{ productId: 'product-a', quantity: 2 }]);
    assert.equal(forwarded.body.paymentMethod, 'STRIPE');
    assert.equal(forwarded.body.totalCents, undefined);
    assert.equal(forwarded.body.tenantId, undefined);
  });
});

test('legacy checkout without tenant fails before any database or provider work', async () => {
  const app = express();
  app.use(express.json());
  app.post('/create-session', legacyCheckoutHandler({ db: { product: { findFirst: () => assert.fail('Unscoped product query') } }, handleCheckout: () => assert.fail('Unscoped checkout') }));
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/create-session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 404);
  });
});

test('the real legacy route reaches canonical Demo checkout protection', async () => {
  const { prisma } = await import('../src/db/prisma.js');
  const { default: checkoutRoutes } = await import('../src/routes/checkout.js');
  const originalProduct = prisma.product.findFirst;
  const originalTenant = prisma.tenant.findUnique;
  const originalCreateOrder = prisma.order.create;
  prisma.product.findFirst = async () => ({ id: 'product-demo' });
  prisma.tenant.findUnique = async () => ({ id: 'tenant-demo', isDemo: true });
  prisma.order.create = () => assert.fail('Demo checkout must not create an order');
  try {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.tenant = { id: 'tenant-demo' }; next(); });
    app.use('/api/checkout', checkoutRoutes);
    await withServer(app, async (base) => {
      const response = await fetch(`${base}/api/checkout/create-session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productSlug: 'cream', email: 'buyer@example.com' }) });
      assert.equal(response.status, 409);
      assert.equal((await response.json()).error, 'DEMO_CHECKOUT_DISABLED');
    });
  } finally {
    prisma.product.findFirst = originalProduct;
    prisma.tenant.findUnique = originalTenant;
    prisma.order.create = originalCreateOrder;
  }
});

test('the Stripe HTTP webhook rejects mismatches and never resurrects a refunded order', async () => {
  const { default: Stripe } = await import('stripe');
  const { prisma } = await import('../src/db/prisma.js');
  const { default: stripeRoutes } = await import('../src/routes/stripe.js');
  const originalFind = prisma.order.findUnique;
  const originalTransaction = prisma.$transaction;
  let transactions = 0;
  prisma.order.findUnique = async () => ({ ...order, paymentStatus: 'REFUNDED', refundedCents: 1000 });
  prisma.$transaction = () => { transactions += 1; assert.fail('Rejected or refunded confirmation must not mutate orders'); };
  const app = express();
  app.use('/api/stripe', stripeRoutes);
  try {
    await withServer(app, async (base) => {
      const send = async (providerSession) => {
        const payload = JSON.stringify({ id: 'evt_fixture', type: 'checkout.session.completed', data: { object: providerSession } });
        const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_commerce_fixture' });
        return fetch(`${base}/api/stripe/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body: payload });
      };
      assert.equal((await send({ ...session, payment_status: 'unpaid' })).status, 409);
      assert.equal((await send({ ...session, amount_total: 1 })).status, 409);
      assert.equal((await send({ ...session, metadata: { ...session.metadata, tenantId: 'tenant-b' } })).status, 409);
      assert.equal((await send(session)).status, 200);
      assert.equal(transactions, 0);
    });
  } finally {
    prisma.order.findUnique = originalFind;
    prisma.$transaction = originalTransaction;
  }
});

test('the Stripe HTTP webhook settles a matching paid session once with the checkout commission snapshot', async () => {
  const { default: Stripe } = await import('stripe');
  const { prisma } = await import('../src/db/prisma.js');
  const { default: stripeRoutes } = await import('../src/routes/stripe.js');
  const originalFind = prisma.order.findUnique;
  const originalTransaction = prisma.$transaction;
  let currentOrder = { ...order, subtotalCents: 1000, shippingCents: 0, paymentStatus: 'PENDING', refundedCents: 0 };
  const financialRows = [];
  const entries = [];
  let balanceRows = 0;
  const db = {
    order: {
      findUnique: async () => ({ ...currentOrder }),
      updateMany: async ({ where, data }) => {
        if (currentOrder.paymentStatus !== where.paymentStatus) return { count: 0 };
        currentOrder = { ...currentOrder, ...data };
        return { count: 1 };
      }
    },
    commissionPolicy: { findUnique: async () => ({ id: 'changed-policy', storeCommissionBps: 300 }) },
    financialTransaction: {
      findUnique: async ({ where }) => financialRows.find((row) => where.id ? row.id === where.id : row.idempotencyKey === where.idempotencyKey) || null,
      create: async ({ data }) => { const row = { id: 'sale-a', ...data }; financialRows.push(row); return row; }
    },
    ledgerEntry: { createMany: async ({ data }) => { entries.push(...data); } },
    tenantLedger: { upsert: async () => { balanceRows += 1; } }
  };
  prisma.order.findUnique = db.order.findUnique;
  prisma.$transaction = async (work) => work(db);
  const app = express();
  app.use('/api/stripe', stripeRoutes);
  try {
    await withServer(app, async (base) => {
      const payload = JSON.stringify({ id: 'evt_paid_fixture', type: 'checkout.session.completed', data: { object: session } });
      const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_commerce_fixture' });
      const send = () => fetch(`${base}/api/stripe/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body: payload });
      assert.equal((await send()).status, 200);
      assert.equal((await send()).status, 200);
      assert.equal(currentOrder.paymentStatus, 'PAID');
      assert.equal(financialRows.length, 1);
      assert.equal(financialRows[0].tenantId, 'tenant-a');
      assert.equal(financialRows[0].referenceId, 'order-a');
      assert.equal(financialRows[0].platformCommissionCents, 65);
      assert.equal(financialRows[0].tenantProceedsCents, 935);
      assert.equal(financialRows[0].metadataJson.commissionBps, 650);
      assert.equal(entries.filter((entry) => entry.direction === 'DEBIT').reduce((total, entry) => total + entry.amountCents, 0), 1000);
      assert.equal(entries.filter((entry) => entry.direction === 'CREDIT').reduce((total, entry) => total + entry.amountCents, 0), 1000);
      assert.equal(balanceRows, 1);
    });
  } finally {
    prisma.order.findUnique = originalFind;
    prisma.$transaction = originalTransaction;
  }
});
