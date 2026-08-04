import test from 'node:test';
import assert from 'node:assert/strict';
import { presentMarketplaceLoads } from '../src/services/marketplacePresentation.js';

test('anonymous marketplace responses conceal all commercial amounts', () => {
  const [row] = presentMarketplaceLoads({ loads: [{ id: 'load-1', budgetCents: 100000, awardedAmountCents: 90000, bids: [{ id: 'bid-1', amountCents: 85000 }] }] });
  assert.equal(row.budgetCents, null);
  assert.equal(row.awardedAmountCents, null);
  assert.deepEqual(row.bids, []);
  assert.equal(row.bidCount, 1);
});

test('authenticated marketplace responses retain prices and include simulated jobs', () => {
  const rows = presentMarketplaceLoads({
    authenticated: true,
    loads: [{ id: 'load-1', budgetCents: 100000, bids: [] }],
    simulationEvents: [{ id: 'sim-1', createdAt: new Date('2026-08-01T00:00:00Z'), payloadJson: { origin: 'Winnipeg', destination: 'Calgary', amountCents: 125000 } }]
  });
  assert.equal(rows[0].isSimulated, true);
  assert.equal(rows[0].budgetCents, 125000);
  assert.equal(rows[1].budgetCents, 100000);
});
