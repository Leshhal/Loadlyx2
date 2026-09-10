import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('cart navigation opens focused checkout instead of the catalog', async () => {
  const source = await read('components/StoreCartLink.jsx');
  assert.match(source, /checkout\?cart=1/);
  assert.doesNotMatch(source, /tenantSlug}\/catalog/);
});

test('catalog does not embed a second checkout at the bottom', async () => {
  const source = await read('app/catalog/page.jsx');
  assert.doesNotMatch(source, /Checkout Preview|card checkout-card/);
  assert.doesNotMatch(source, /Tenant storefront|tenant storefront/);
});

test('default theme ships distinct storefront and loadboard banners', async () => {
  await Promise.all([
    access(new URL('public/store-assets/hero-moving-supplies.webp', root)),
    access(new URL('public/store-assets/hero-yxe-totes.webp', root)),
    access(new URL('public/store-assets/hero-loadboard.webp', root))
  ]);
  const css = await read('app/globals.css');
  assert.match(css, /hero-moving-supplies\.webp/);
  assert.match(css, /hero-yxe-totes\.webp/);
  assert.match(css, /hero-loadboard\.webp/);
});