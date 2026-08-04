import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSimulationEvents, summarizeSimulation } from '../src/services/simulationService.js';

test('simulation intensity controls isolated event volume', () => {
  assert.equal(buildSimulationEvents({ intensity: 'LOW' }).length, 8);
  assert.equal(buildSimulationEvents({ intensity: 'MEDIUM' }).length, 24);
  assert.equal(buildSimulationEvents({ intensity: 'HIGH' }).length, 60);
});

test('every simulation event is watermarked and financially inert', () => {
  const events = buildSimulationEvents({ intensity: 'LOW', tenantId: 'tenant-1', now: new Date('2026-08-01T00:00:00Z'), runId: 'run-1' });
  for (const event of events) {
    assert.equal(event.isSimulated, true);
    assert.equal(event.payloadJson.simulation, true);
    assert.equal(event.payloadJson.financialEffect, 'NONE');
    assert.equal(event.payloadJson.notificationsSent, false);
    assert.equal(event.tenantId, 'tenant-1');
  }
});

test('simulation summary counts each activity type', () => {
  const events = buildSimulationEvents({ intensity: 'LOW' });
  const summary = summarizeSimulation(events);
  assert.equal(summary.total, 8);
  assert.equal(Object.keys(summary.byKind).length, 8);
});
