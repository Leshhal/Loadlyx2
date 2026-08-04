import assert from 'node:assert/strict';
import test from 'node:test';

import { aggregateRatings, verifyReviewTransaction } from '../src/services/reputationService.js';

test('rating aggregation excludes moderated reviews and reports distribution', () => {
  const result = aggregateRatings([
    { rating: 5, moderationStatus: 'PUBLISHED' },
    { rating: 4, moderationStatus: 'PUBLISHED' },
    { rating: 1, moderationStatus: 'HIDDEN' }
  ]);
  assert.equal(result.average, 4.5);
  assert.equal(result.count, 2);
  assert.deepEqual(result.distribution, { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 });
});

test('paid store-order customer is eligible for a verified review', async () => {
  const prisma = { order: { findUnique: async () => ({ status: 'PAID', customerEmail: 'buyer@example.com', tenantId: 'tenant-1' }) } };
  const result = await verifyReviewTransaction(prisma, { transactionType: 'STORE_ORDER', transactionId: 'order-1', user: { email: 'buyer@example.com', tenantId: null } });
  assert.deepEqual(result, { verified: true, tenantId: 'tenant-1' });
});

test('unrelated user cannot review a completed store order', async () => {
  const prisma = { order: { findUnique: async () => ({ status: 'FULFILLED', customerEmail: 'buyer@example.com', tenantId: 'tenant-1' }) } };
  const result = await verifyReviewTransaction(prisma, { transactionType: 'STORE_ORDER', transactionId: 'order-1', user: { email: 'other@example.com', tenantId: 'tenant-2' } });
  assert.equal(result.verified, false);
});

test('marketplace review requires a completed load and participant', async () => {
  const prisma = { load: { findUnique: async () => ({ status: 'COMPLETED', tenantId: 'tenant-1', quote: { email: 'poster@example.com' } }) } };
  const result = await verifyReviewTransaction(prisma, { transactionType: 'MARKETPLACE_LOAD', transactionId: 'load-1', user: { email: 'poster@example.com', tenantId: null } });
  assert.equal(result.verified, true);
});
