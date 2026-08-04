import assert from 'node:assert/strict';
import test from 'node:test';

import { approximateConnection, hashConnectionValue, mapPosition } from '../src/services/locationPrivacy.js';

test('connection hashes are stable but do not reveal the input', () => {
  const hash = hashConnectionValue('203.0.113.10', 'test-secret');
  assert.equal(hash, hashConnectionValue('203.0.113.10', 'test-secret'));
  assert.equal(hash.includes('203.0.113.10'), false);
});

test('edge location is rounded to approximate precision', () => {
  process.env.CONNECTION_HASH_SECRET = 'test-secret';
  const result = approximateConnection({ headers: { 'x-forwarded-for': '203.0.113.10', 'x-vercel-ip-city': 'Winnipeg', 'x-vercel-ip-country': 'CA', 'x-vercel-ip-latitude': '49.895136', 'x-vercel-ip-longitude': '-97.138374' }, socket: {} });
  assert.equal(result.latitude, 49.9);
  assert.equal(result.longitude, -97.14);
  assert.equal(result.city, 'Winnipeg');
  assert.equal(Object.hasOwn(result, 'ip'), false);
});

test('coordinates map into bounded percentage positions', () => {
  assert.deepEqual(mapPosition(0, 0), { x: 50, y: 50 });
  assert.deepEqual(mapPosition(90, -180), { x: 0, y: 0 });
  assert.equal(mapPosition(100, 0), null);
});
