import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL('../prisma/migrations/20260909120000_moving_supplies_tenant/migration.sql', import.meta.url);
const sql = await readFile(migrationUrl, 'utf8');

test('Moving Supplies migration accepts the production retail category slugs', () => {
  assert.match(sql, /'moving-boxes','moving-supplies','hitch-accessories','vehicle-wiring'/);
  assert.doesNotMatch(sql, /bike-racks-hitch-accessories/);
});

test('Moving Supplies migration fails closed before writes and preserves orders', () => {
  const safetyGate = sql.indexOf('PRODUCT TENANT MIGRATION SAFETY BLOCKED');
  const firstWrite = sql.indexOf('INSERT INTO "Tenant"');
  assert.ok(safetyGate >= 0 && safetyGate < firstWrite);
  assert.doesNotMatch(sql, /(?:UPDATE|DELETE FROM)\s+"Order(?:Item)?"/i);
  assert.match(sql, /DELETE FROM "StoreCart"/);
});

test('Moving Supplies migration activates routing and tenant ownership', () => {
  assert.match(sql, /'movingsupplies\.loadlyx\.com','movingsupplies'/);
  assert.match(sql, /UPDATE "Product" SET\s+"tenantId"=/);
  assert.match(sql, /WHERE "tenantId"=\(SELECT id FROM "Tenant" WHERE slug='cansask'\)/);
});