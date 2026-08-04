import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShippingRequest } from '../src/services/shippingService.js';

const valid={originPostalCode:'S7K 0J5',destinationPostalCode:'S4P 3Y2',originCountry:'CA',destinationCountry:'CA',currency:'cad',packages:[{weightKg:2,lengthCm:40,widthCm:30,heightCm:25,quantity:2}]};
test('shipping request accounts for destination, dimensions, and total package weight',()=>{assert.equal(normalizeShippingRequest(valid).packageWeightKg,4);});
test('shipping request rejects missing dimensions and postal codes',()=>{assert.throws(()=>normalizeShippingRequest({...valid,destinationPostalCode:''}));assert.throws(()=>normalizeShippingRequest({...valid,packages:[{weightKg:2,lengthCm:0,widthCm:30,heightCm:25,quantity:1}]}));});
