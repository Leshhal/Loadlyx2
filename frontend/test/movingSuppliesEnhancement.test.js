import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('mobile storefront uses text-first banner and bounded viewport rails', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.ok(css.includes('.tenant-store-hero>img{position:relative'));
  assert.ok(css.includes('aspect-ratio:16/7'));
  assert.ok(css.includes('max-width:calc(100vw - 28px)'));
  assert.ok(css.includes('.tenant-store .store-products{grid-template-columns:repeat(2,minmax(0,1fr))'));
});

test('one product image component standardizes containment and gallery behavior', () => {
  const component = readFileSync(new URL('../components/StoreProductImage.jsx', import.meta.url), 'utf8');
  const detail = readFileSync(new URL('../components/TenantProductDetail.jsx', import.meta.url), 'utf8');
  const catalog = readFileSync(new URL('../app/catalog/page.jsx', import.meta.url), 'utf8');
  assert.ok(component.includes('gallery && ordered.length > 1'));
  assert.ok(detail.includes('StoreProductImage'));
  assert.ok(detail.includes('gallery'));
  assert.ok(catalog.includes('StoreProductImage'));
});

test('social proof is real-order only and privacy safe', () => {
  const route = readFileSync(new URL('../../backend/src/routes/orders.js', import.meta.url), 'utf8');
  const socialRoute = route.slice(route.indexOf("router.get('/social-proof/recent'"));
  assert.ok(socialRoute.includes("paymentStatus: 'PAID'"));
  assert.ok(socialRoute.includes('refundedCents: 0'));
  assert.ok(socialRoute.includes('tenant?.isDemo'));
  assert.ok(!socialRoute.includes('customerEmail'));
  assert.ok(!socialRoute.includes('customerName'));
  assert.ok(!socialRoute.includes('shippingAddressJson'));
});
