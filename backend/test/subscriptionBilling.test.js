import test from 'node:test';
import assert from 'node:assert/strict';
import { getCommercePlan } from '../src/config/plans.js';
import { cancelRecurringSubscription, createRecurringCheckout, handleSubscriptionEvent } from '../src/services/subscriptionBilling.js';

function fixture() {
  const tenant = { id: 'tenant-commerce', name: 'Test Commerce', email: 'owner@example.test', isActive: true, isDemo: false, brandingJson: { businessType: 'COMMERCE' } };
  const local = { id: 'local-sub', tenantId: tenant.id, status: 'TRIALING', planCode: 'STARTER', monthlyPriceCents: 2900, currency: 'cad', providerCustomerId: null, providerSubscriptionId: null };
  const sessions = [];
  const transactions = [];
  const entries = [];
  let createCount = 0;
  let lastCheckout;
  const provider = { id: 'sub_stripe', customer: 'cus_commerce', status: 'active', cancel_at_period_end: false,
    metadata: { billingPurpose: 'LOADLYX_SUBSCRIPTION', tenantId: tenant.id, localSubscriptionId: local.id, planCode: 'STARTER', monthlyPriceCents: '2900' },
    items: { data: [{ quantity: 1, price: { currency: 'cad', unit_amount: 2900, recurring: { interval: 'month', interval_count: 1 } } }] },
    current_period_start: 1700000000, current_period_end: 1702592000 };
  const tx = {
    $executeRaw: async () => 1,
    tenant: { findUnique: async () => tenant, update: async ({ data }) => Object.assign(tenant, data) },
    subscription: { findUnique: async () => local, update: async ({ data }) => Object.assign(local, data) },
    financialTransaction: {
      findUnique: async ({ where }) => transactions.find((row) => where.id ? row.id === where.id : row.idempotencyKey === where.idempotencyKey) || null,
      create: async ({ data }) => { const row = { id: `txn-${transactions.length}`, ...data }; transactions.push(row); return row; }
    },
    ledgerEntry: { createMany: async ({ data }) => entries.push(...data) },
    auditEvent: { create: async ({ data }) => data }
  };
  const db = { ...tx, $transaction: async (work) => work(tx) };
  const stripeClient = {
    customers: { create: async () => ({ id: 'cus_commerce' }) },
    subscriptions: { list: async () => ({ data: [] }), retrieve: async () => provider, update: async (_id, data) => Object.assign(provider, data) },
    checkout: { sessions: { list: async () => ({ data: sessions }), create: async (input) => {
      lastCheckout = input; createCount++;
      const session = { id: 'cs_recurring', url: 'https://checkout.stripe.com/test', mode: input.mode, metadata: input.metadata };
      sessions.push(session); return session;
    } } }
  };
  return { tenant, local, sessions, transactions, entries, provider, db, stripeClient, created: () => createCount, checkout: () => lastCheckout };
}

function start(f, plan = 'STARTER') {
  return createRecurringCheckout({ db: f.db, stripeClient: f.stripeClient, tenant: f.tenant, plan: getCommercePlan(plan), requestId: 'request_12345678', frontendUrl: 'https://www.loadlyx.com' });
}

test('commerce checkout uses server CAD prices and monthly recurring Stripe subscription mode', async () => {
  for (const [code, cents] of [['STARTER', 2900], ['GROWTH', 5900], ['PROFESSIONAL', 9900]]) {
    const f = fixture();
    const result = await start(f, code);
    assert.equal(result.monthlyPriceCents, cents);
    assert.equal(result.recurring, true);
    assert.equal(f.checkout().mode, 'subscription');
    assert.equal(f.checkout().payment_method_collection, 'always');
    assert.equal(f.checkout().subscription_data.trial_period_days, 30);
    assert.equal(f.checkout().subscription_data.trial_settings.end_behavior.missing_payment_method, 'cancel');
    assert.deepEqual(f.checkout().line_items[0].price_data.recurring, { interval: 'month', interval_count: 1 });
    assert.equal(f.checkout().line_items[0].price_data.currency, 'cad');
    assert.equal(f.checkout().line_items[0].price_data.unit_amount, cents);
    assert.equal(f.local.status, 'TRIALING');
    assert.equal(f.local.providerSubscriptionId, null);
  }
});

test('checkout retries reuse open session and another active subscription blocks duplicate purchase', async () => {
  const f = fixture();
  await start(f);
  assert.equal((await start(f)).reused, true);
  assert.equal(f.created(), 1);
  await assert.rejects(start(f, 'GROWTH'), /existing checkout/);
  f.sessions.length = 0;
  f.stripeClient.subscriptions.list = async () => ({ data: [{ status: 'active' }] });
  await assert.rejects(start(f), /already exists/);
});

test('another trial cannot be opened after this business has used a trial', async () => {
  const f = fixture();
  f.stripeClient.subscriptions.list = async () => ({ data: [{ status: 'canceled', trial_start: 1700000000, metadata: { billingPurpose: 'LOADLYX_SUBSCRIPTION' } }] });
  await assert.rejects(start(f), /already used its free trial/);
  assert.equal(f.created(), 0);
});

test('Demo, inactive, noncommerce and client price overrides cannot create subscription sessions', async () => {
  for (const change of [{ isDemo: true }, { isActive: false }, { brandingJson: {} }]) {
    const f = fixture(); Object.assign(f.tenant, change);
    await assert.rejects(start(f), /active external commerce/);
    assert.equal(f.created(), 0);
  }
  const f = fixture();
  await assert.rejects(createRecurringCheckout({ db: f.db, stripeClient: f.stripeClient, tenant: f.tenant, plan: { ...getCommercePlan('STARTER'), monthlyPriceCents: 1 }, requestId: 'request_12345678', frontendUrl: 'https://www.loadlyx.com' }), /Invalid commerce/);
});

test('provider subscription sync validates tenant, customer, local identity and monthly price', async () => {
  const f = fixture(); await start(f);
  const event = { type: 'checkout.session.completed', data: { object: { mode: 'subscription', subscription: 'sub_stripe' } } };
  assert.equal(await handleSubscriptionEvent({ db: f.db, stripeClient: f.stripeClient, event }), true);
  assert.equal(f.local.status, 'ACTIVE');
  assert.equal(f.local.providerSubscriptionId, 'sub_stripe');
  assert.equal(f.transactions.length, 0);
  f.provider.customer = 'cus_other';
  await assert.rejects(handleSubscriptionEvent({ db: f.db, stripeClient: f.stripeClient, event }), /ownership/);
  f.provider.customer = 'cus_commerce';
  f.provider.items.data[0].price.recurring.interval = 'year';
  await assert.rejects(handleSubscriptionEvent({ db: f.db, stripeClient: f.stripeClient, event }), /monthly CAD/);
});

test('paid invoice ledger uses actual invoice amount once across webhook redelivery', async () => {
  const f = fixture(); await start(f);
  const event = { type: 'invoice.paid', data: { object: { id: 'in_paid', subscription: 'sub_stripe', customer: 'cus_commerce', currency: 'cad', status: 'paid', amount_paid: 2000 } } };
  await handleSubscriptionEvent({ db: f.db, stripeClient: f.stripeClient, event });
  await handleSubscriptionEvent({ db: f.db, stripeClient: f.stripeClient, event });
  assert.equal(f.transactions.length, 1);
  assert.equal(f.transactions[0].grossCents, 2000);
  assert.equal(f.transactions[0].referenceId, 'in_paid');
  assert.equal(f.entries.filter((row) => row.direction === 'DEBIT').reduce((sum, row) => sum + row.amountCents, 0), 2000);
  assert.equal(f.entries.filter((row) => row.direction === 'CREDIT').reduce((sum, row) => sum + row.amountCents, 0), 2000);
  assert.equal(f.local.monthlyPriceCents, 2900);
});

test('renewal failure and cancellation reconcile provider state and cancellation reaches Stripe', async () => {
  const f = fixture(); await start(f);
  f.provider.status = 'past_due';
  await handleSubscriptionEvent({ db: f.db, stripeClient: f.stripeClient, event: { type: 'invoice.payment_failed', data: { object: { subscription: 'sub_stripe' } } } });
  assert.equal(f.local.status, 'PAST_DUE');
  await cancelRecurringSubscription({ db: f.db, stripeClient: f.stripeClient, tenantId: f.tenant.id });
  assert.equal(f.provider.cancel_at_period_end, true);
  assert.equal(f.local.cancelAtPeriodEnd, true);
  f.provider.status = 'canceled';
  await handleSubscriptionEvent({ db: f.db, stripeClient: f.stripeClient, event: { type: 'customer.subscription.deleted', data: { object: { id: 'sub_stripe' } } } });
  assert.equal(f.local.status, 'CANCELED');
});
