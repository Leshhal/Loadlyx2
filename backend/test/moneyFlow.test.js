import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAllocationBalances, calculateMarketplaceAllocation, calculateStoreAllocation } from '../src/services/moneyFlow.js';

test('store sale separates tax, processor fee, platform commission, and tenant proceeds', () => {
  const result = calculateStoreAllocation({ subtotalCents: 10000, shippingCents: 1000, taxCents: 1300, discountCents: 500, processorFeeCents: 350, commissionBps: 800 });
  assert.deepEqual(result, {
    grossCents: 11800, subtotalCents: 10000, shippingCents: 1000, taxCents: 1300, discountCents: 500,
    processorFeeCents: 350, platformCommissionCents: 760, tenantProceedsCents: 9390, commissionBps: 800
  });
  assertAllocationBalances(result, ['taxCents', 'processorFeeCents', 'platformCommissionCents', 'tenantProceedsCents']);
});

test('marketplace deal allocates platform, broker, provider, tax, and processor amounts', () => {
  const result = calculateMarketplaceAllocation({ grossCents: 50000, taxCents: 5000, processorFeeCents: 1500, platformCommissionBps: 700, brokerMarginBps: 1000 });
  assert.deepEqual(result, {
    grossCents: 50000, taxCents: 5000, processorFeeCents: 1500, platformCommissionCents: 3150,
    brokerMarginCents: 4500, providerProceedsCents: 35850, platformCommissionBps: 700, brokerMarginBps: 1000
  });
  assertAllocationBalances(result, ['taxCents', 'processorFeeCents', 'platformCommissionCents', 'brokerMarginCents', 'providerProceedsCents']);
});

test('rejects impossible allocations', () => {
  assert.throws(() => calculateStoreAllocation({ subtotalCents: 100, processorFeeCents: 90, commissionBps: 5000 }), /fees exceed/);
  assert.throws(() => calculateMarketplaceAllocation({ grossCents: 100, processorFeeCents: 80, platformCommissionBps: 5000 }), /fees and margins exceed/);
});
