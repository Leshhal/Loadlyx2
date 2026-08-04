import assert from 'node:assert/strict';
import test from 'node:test';

import { assertMarketplaceTransition, canAccessLoadConversation, canBid, canManageLoad, canPostLoad } from '../src/services/marketplaceWorkflow.js';

test('general customers post loads but cannot bid', () => {
  assert.equal(canPostLoad('MARKETPLACE_USER'), true);
  assert.equal(canBid('MARKETPLACE_USER'), false);
});

test('brokers and carriers can bid while tenant staff cannot', () => {
  assert.equal(canBid('BROKER'), true);
  assert.equal(canBid('CARRIER'), true);
  assert.equal(canBid('TENANT_STAFF'), false);
});

test('only poster, managing broker, or platform admin manages a load', () => {
  const load = { posterId: 'poster', brokerId: 'broker', carrierId: 'carrier' };
  assert.equal(canManageLoad({ userId: 'poster', role: 'MARKETPLACE_USER' }, load), true);
  assert.equal(canManageLoad({ userId: 'carrier', role: 'CARRIER' }, load), false);
  assert.equal(canManageLoad({ userId: 'admin', role: 'ADMIN' }, load), true);
});

test('conversation access is limited to transaction participants', () => {
  const load = { posterId: 'poster', brokerId: 'broker', carrierId: 'carrier', bids: [{ bidderId: 'bidder' }] };
  assert.equal(canAccessLoadConversation({ userId: 'bidder', role: 'CARRIER' }, load), true);
  assert.equal(canAccessLoadConversation({ userId: 'stranger', role: 'CARRIER' }, load), false);
});

test('marketplace status transitions prevent delivery from skipping funding and transit', () => {
  assert.equal(assertMarketplaceTransition('AWARDED', 'FUNDED'), 'FUNDED');
  assert.equal(assertMarketplaceTransition('IN_TRANSIT', 'DELIVERED'), 'DELIVERED');
  assert.throws(() => assertMarketplaceTransition('AWARDED', 'DELIVERED'), /Invalid marketplace load transition/);
});
