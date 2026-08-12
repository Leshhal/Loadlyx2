import assert from 'node:assert/strict';
import test from 'node:test';
import { assertAssignmentTransition, calculateRatePerMile, canPostTruck, canSearchTrucks, publicTrackingPoint, publicTrustProfile, trackingIsAllowed } from '../src/services/loadlyxOneWorkflow.js';

test('capacity and truck search permissions are role-specific', () => {
  assert.equal(canPostTruck('CARRIER'), true);
  assert.equal(canPostTruck('DRIVER'), true);
  assert.equal(canPostTruck('MARKETPLACE_USER'), false);
  assert.equal(canSearchTrucks('BROKER'), true);
  assert.equal(canSearchTrucks('MARKETPLACE_USER'), false);
});

test('driver execution cannot skip material milestones', () => {
  assert.equal(assertAssignmentTransition('ASSIGNMENT_PENDING', 'DRIVER_ACCEPTED'), 'DRIVER_ACCEPTED');
  assert.equal(assertAssignmentTransition('ARRIVED_PICKUP', 'LOADED'), 'LOADED');
  assert.throws(() => assertAssignmentTransition('DRIVER_ACCEPTED', 'DELIVERED'), /Invalid freight assignment transition/);
});

test('tracking requires assignment, consent, and active execution', () => {
  const profile = { trackingConsentAt: new Date('2026-01-01'), trackingRevokedAt: null };
  assert.equal(trackingIsAllowed({ assignment: { driverId: 'd1', status: 'IN_TRANSIT' }, driverId: 'd1', profile }), true);
  assert.equal(trackingIsAllowed({ assignment: { driverId: 'd2', status: 'IN_TRANSIT' }, driverId: 'd1', profile }), false);
  assert.equal(trackingIsAllowed({ assignment: { driverId: 'd1', status: 'COMPLETE' }, driverId: 'd1', profile }), false);
});

test('public tracking is approximate and trust excludes private risk signals', () => {
  assert.deepEqual(publicTrackingPoint({ latitude: 50.445678, longitude: -104.612345, capturedAt: 'now' }), { latitude: 50.45, longitude: -104.61, eta: null, capturedAt: 'now' });
  const trust = publicTrustProfile({ reviews: { average: 4.8, count: 20 }, completedLoads: 10, pickupOnTime: 9, deliveryOnTime: 8, cancellations: 1, badges: ['VERIFIED'] });
  assert.equal(trust.onTimePickupPercent, 90);
  assert.equal('riskBand' in trust, false);
});

test('rate per mile is derived from route distance', () => {
  assert.equal(calculateRatePerMile(100000, 160.934), 1000);
  assert.equal(calculateRatePerMile(100000, 0), null);
});
