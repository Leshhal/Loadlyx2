'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

function cartKey(tenantSlug) {
  return `loadlyx_cart_${tenantSlug || 'default'}`;
}

function readCart(tenantSlug) {
  try { return JSON.parse(window.localStorage.getItem(cartKey(tenantSlug)) || '[]'); }
  catch { return []; }
}

export default function TenantProductDetail({ product, tenantSlug }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants?.[0]?.id || '');
  const [message, setMessage] = useState('');
  const selectedVariant = useMemo(
    () => product.variants?.find((variant) => variant.id === selectedVariantId) || null,
    [product.variants, selectedVariantId]
  );
  const unitPriceCents = Number(selectedVariant?.salePriceCents ?? selectedVariant?.priceCents ?? product.salePriceCents ?? product.priceCents ?? 0);
  const originalPriceCents = Number(selectedVariant?.priceCents ?? product.priceCents ?? 0);
  const availableStock = Number(selectedVariant?.stock ?? product.stock ?? 0);
  const image = product.primaryImage || product.images?.[0] || null;

  function addToCart() {
    const current = readCart(tenantSlug);
    const lineKey = `${product.id}:${selectedVariantId || 'default'}`;
    const existing = current.find((item) => (item.lineKey || `${item.productId}:default`) === lineKey);
    const next = existing
      ? current.map((item) => (item.lineKey || `${item.productId}:default`) === lineKey ? { ...item, quantity: item.quantity + quantity } : item)
      : [...current, { lineKey, productId: product.id, variantId: selectedVariantId || null, quantity, product: { ...product, priceCents: unitPriceCents } }];
    window.localStorage.setItem(cartKey(tenantSlug), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('loadlyx:cart-updated', { detail: next }));
    setMessage(`${quantity} ${quantity === 1 ? 'item' : 'items'} added to your cart.`);
  }

  return <main className="lx-storefront tenant-product-page">
    <Link href={`/tenant/${tenantSlug}/catalog`} className="text-link">← Back to store</Link>
    <section className="card tenant-product-detail">
      <div className="product-image tenant-product-detail-image">
        {image?.url ? <img src={image.url} alt={image.altText || product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div className="muted">No image available</div>}
      </div>
      <div className="grid" style={{ alignContent: 'center', gap: 16 }}>
        <span className="badge">{product.category?.name || 'Product'}</span>
        <h1 className="page-title">{product.name}</h1>
        <p className="lead">{product.longDescription || product.description || 'Product details are being prepared.'}</p>
        <div className="price">
          ${(unitPriceCents / 100).toFixed(2)}
          {unitPriceCents < originalPriceCents ? <del className="muted" style={{ marginLeft: 10 }}>${(originalPriceCents / 100).toFixed(2)}</del> : null}
        </div>
        {product.variants?.length ? <label className="field">Option<select value={selectedVariantId} onChange={(event) => setSelectedVariantId(event.target.value)}>{product.variants.filter((variant) => variant.isActive !== false).map((variant) => <option value={variant.id} key={variant.id}>{variant.name} — ${((variant.salePriceCents ?? variant.priceCents) / 100).toFixed(2)}</option>)}</select></label> : null}
        <div className="muted small">{availableStock > 0 ? `${availableStock} in stock` : 'Currently unavailable'} · {Number(product.weightKg || 0).toFixed(2)} kg</div>
        <label className="field" style={{ maxWidth: 150 }}>Quantity<input type="number" min="1" max={Math.max(1, availableStock)} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} /></label>
        <div className="action-row"><button className="btn" type="button" disabled={availableStock < 1} onClick={addToCart}>Add to cart</button><Link className="btn secondary" href={`/tenant/${tenantSlug}/checkout?product=${encodeURIComponent(product.slug)}&qty=${quantity}`}>Buy now</Link><Link className="text-link" href={`/tenant/${tenantSlug}/checkout?cart=1`}>Open cart checkout</Link></div>
        {message ? <p className="success" role="status">{message}</p> : null}
        <div className="tenant-trust-banner"><strong>Tenant-owned storefront</strong><span className="muted">Payment and fulfilment options are confirmed during checkout.</span></div>
      </div>
    </section>
  </main>;
}
