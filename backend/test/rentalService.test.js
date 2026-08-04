import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRentalPrice, hasRentalCapacity, validateRentalDates } from '../src/services/rentalService.js';

test('YXE rental minimum and additional weeks calculate exactly',()=>{assert.equal(calculateRentalPrice({weeklyRateCents:4900,minimumRentalWeeks:2,minimumChargeCents:9800,rentalWeeks:2}),9800);assert.equal(calculateRentalPrice({weeklyRateCents:4900,minimumRentalWeeks:2,minimumChargeCents:9800,rentalWeeks:3}),14700);});
test('rental dates require delivery before move and pickup after move',()=>{assert.doesNotThrow(()=>validateRentalDates({deliveryDate:'2026-08-01',moveDate:'2026-08-08',pickupDate:'2026-08-15'}));assert.throws(()=>validateRentalDates({deliveryDate:'2026-08-09',moveDate:'2026-08-08',pickupDate:'2026-08-15'}));});
test('overlapping rental inventory cannot be overbooked',()=>{assert.equal(hasRentalCapacity({inventoryUnits:100,alreadyReservedUnits:80,requestedUnits:20}),true);assert.equal(hasRentalCapacity({inventoryUnits:100,alreadyReservedUnits:80,requestedUnits:21}),false);});
