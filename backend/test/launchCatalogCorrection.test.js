import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(new URL('../prisma/migrations/20260903100000_launch_catalog_correction/migration.sql', import.meta.url), 'utf8');

test('catalog correction is tenant scoped, idempotent, and non-destructive', () => {
  assert.doesNotMatch(sql, /\b(TRUNCATE|DROP TABLE|DELETE FROM)\b/i);
  assert.match(sql, /ON CONFLICT \("tenantId","slug"\) DO UPDATE/);
  assert.match(sql, /t\.slug='cansask'/);
  assert.match(sql, /t\.slug='demo'/);
  assert.match(sql, /t\.slug='yxetotes'/);
});

test('CanSask has the four approved categories and approved named prices', () => {
  for (const category of ['Moving Boxes','Moving Supplies','Bike Racks / Hitch & Accessories','Vehicle Wiring']) assert.match(sql, new RegExp(category.replace(/[\/]/g, '\\$&')));
  for (const cents of [1057,1190,1323,1456,1988,2321,3584,5446,3052,4515,5313,6244,8904,16086]) assert.match(sql, new RegExp(`[, ]${cents}[,)]`));
  assert.doesNotMatch(sql, /UPDATE "Product"[^;]*"priceCents"[^;]*moving-boxes/is);
});

test('Demo and YXE catalogs have distinct product image mappings', () => {
  const demo = [...sql.matchAll(/\/store-assets\/demo-[^']+\.webp/g)].map((m) => m[0]);
  const yxe = [...sql.matchAll(/\/store-assets\/yxe-[^']+\.webp/g)].map((m) => m[0]);
  assert.equal(new Set(demo).size, 5);
  assert.equal(new Set(yxe).size, 3);
  assert.match(sql, /minimumRentalWeeks"=2/);
});
