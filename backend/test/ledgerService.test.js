import test from 'node:test';
import assert from 'node:assert/strict';
import { recordPayout, recordRefund, recordStoreSettlement } from '../src/services/ledgerService.js';

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
      aggregate: async ({ where }) => ({
        _sum: {
          grossCents: transactions
            .filter((item) => item.kind === where.kind && item.referenceType === where.referenceType && item.referenceId === where.referenceId && where.status.in.includes(item.status))
            .reduce((sum, item) => sum + item.grossCents, 0)
        }
      }),
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

test('cumulative refunds cannot exceed the original transaction', async () => {
  const db = fakeDatabase();
  const sale = await recordStoreSettlement(db, { id: 'order-3', tenantId: 'tenant-1', subtotalCents: 10000, shippingCents: 0, currency: 'cad' });
  await recordRefund(db, sale, 7000, 'First partial refund', 'refund-a');
  await assert.rejects(
    recordRefund(db, sale, 3001, 'Attempted excessive refund', 'refund-b'),
    /remaining refundable amount/
  );
  const finalRefund = await recordRefund(db, sale, 3000, 'Remaining refund', 'refund-c');
  assert.equal(finalRefund.grossCents, 3000);
});

test('a withdrawal produces only one payout regardless of payment reference', async () => {
  const db = fakeDatabase();
  const withdrawal = { id: 'withdrawal-1', tenantId: 'tenant-1', amountCents: 5000 };
  const first = await recordPayout(db, withdrawal, 'bank-reference-1');
  const repeated = await recordPayout(db, withdrawal, 'bank-reference-2');
  assert.equal(first.id, repeated.id);
  assert.equal(db.state.transactions.filter((item) => item.kind === 'PAYOUT').length, 1);
});
