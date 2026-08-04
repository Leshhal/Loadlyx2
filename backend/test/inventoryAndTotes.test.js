import test from 'node:test';
import assert from 'node:assert/strict';
import { applyInventoryMovement, availableStock } from '../src/services/inventoryService.js';
import { assertToteTransition } from '../src/services/toteService.js';

test('inventory reservations never exceed stock', () => {
  assert.deepEqual(applyInventoryMovement({ onHand: 10, reserved: 2 }, 'RESERVATION', 3), { onHand: 10, reserved: 5, available: 5 });
  assert.equal(availableStock({ onHand: 10, reserved: 4 }), 6);
  assert.throws(() => applyInventoryMovement({ onHand: 2, reserved: 1 }, 'RESERVATION', 2));
  assert.throws(() => applyInventoryMovement({ onHand: 2, reserved: 0 }, 'SALE', 3));
});

test('tote lifecycle rejects impossible jumps', () => {
  assert.doesNotThrow(() => assertToteTransition('AVAILABLE', 'RESERVED'));
  assert.doesNotThrow(() => assertToteTransition('RETURNED', 'CLEANING'));
  assert.throws(() => assertToteTransition('AVAILABLE', 'RENTED'));
  assert.throws(() => assertToteTransition('RETIRED', 'AVAILABLE'));
});
