import test from 'node:test';
import assert from 'node:assert/strict';
import { recordRefund, recordStoreSettlement } from '../src/services/ledgerService.js';

function fakeDatabase() {
  const transactions = [];
  const entries = [];
  return {
    state: { transactions, entries },
    commissionPolicy: {
      findUnique: async ({ where }) => where.tenantId
        ? null
        : { id: 'global', scopeKey: 'GLOBAL', storeCommissionBps: 800, marketplaceCommissionBps: 700, minimumMarketplaceFeeCents: 0 }
    },
    financialTransaction: {
      findUnique: async ({ where }) => {
        const row = transactions.find((item) => item.id === where.id || item.idempotencyKey === where.idempotencyKey);
        return row ? { ...row, ledgerEntries: entries.filter((item) => item.transactionId === row.id) } : null;
      },
      create: async ({ data }) => {
        const row = { id: `txn-${transactions.length + 1}`, ...data };
        transactions.push(row);
        return row;
      }
    },
    ledgerEntry: {
      createMany: async ({ data }) => { entries.push(...data.map((item, index) => ({ id: `entry-${entries.length + index + 1}`, ...item }))); }
    }
  };
}

test('store settlement writes balanced immutable entries once', async () => {
  const db = fakeDatabase();
  const order = { id: 'order-1', tenantId: 'tenant-1', subtotalCents: 10000, shippingCents: 500, currency: 'cad', stripePaymentIntentId: 'pi_1' };
  const first = await recordStoreSettlement(db, order, { taxCents: 1300, processorFeeCents: 300 });
  const second = await recordStoreSettlement(db, order, { taxCents: 1300, processorFeeCents: 300 });

  assert.equal(first.id, second.id);
  assert.equal(db.state.transactions.length, 1);
  assert.equal(db.state.entries.length, 5);
  const debits = db.state.entries.filter((item) => item.direction === 'DEBIT').reduce((sum, item) => sum + item.amountCents, 0);
  const credits = db.state.entries.filter((item) => item.direction === 'CREDIT').reduce((sum, item) => sum + item.amountCents, 0);
  assert.equal(debits, 11800);
  assert.equal(credits, debits);
  assert.equal(first.platformCommissionCents, 800);
  assert.equal(first.tenantProceedsCents, 9400);
});

test('partial refund reverses the original credits and remains balanced', async () => {
  const db = fakeDatabase();
  const sale = await recordStoreSettlement(db, { id: 'order-2', tenantId: 'tenant-1', subtotalCents: 10000, shippingCents: 0, currency: 'cad' }, { processorFeeCents: 300 });
  const refund = await recordRefund(db, sale, 2500, 'Customer returned part of the order', 'refund-1');
  const repeated = await recordRefund(db, sale, 2500, 'Customer returned part of the order', 'refund-1');

  assert.equal(refund.id, repeated.id);
  assert.equal(refund.kind, 'REFUND');
  const debits = refund.ledgerEntries.filter((item) => item.direction === 'DEBIT').reduce((sum, item) => sum + item.amountCents, 0);
  const credits = refund.ledgerEntries.filter((item) => item.direction === 'CREDIT').reduce((sum, item) => sum + item.amountCents, 0);
  assert.equal(debits, 2500);
  assert.equal(credits, 2500);
});
