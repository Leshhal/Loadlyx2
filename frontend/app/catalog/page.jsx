'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { getTenantSlug as resolveTenantSlug } from '@/lib/tenant';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import CountdownTimer from '../../components/CountdownTimer';

function getTenantSlug() {
return resolveTenantSlug();
}

function getCartStorageKey() {
return `loadlyx_cart_${getTenantSlug() || 'default'}`;
}

function saveCart(nextCart) {
if (typeof window === 'undefined') return;
window.localStorage.setItem(getCartStorageKey(), JSON.stringify(nextCart));
}

function loadCart() {
if (typeof window === 'undefined') return [];
try {
return JSON.parse(window.localStorage.getItem(getCartStorageKey()) || '[]');
} catch {
return [];
}
}

function CatalogPageContent() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState('');
  const [tenantProfile, setTenantProfile] = useState(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTag = searchParams.get('tag');
  const addProductId = searchParams.get('add');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    setCart(loadCart());
  }, []);

  useEffect(() => {
    apiFetch('/tenant/public')
      .then(setTenantProfile)
      .catch(() => null);
  }, []);

  useEffect(() => {
    const suffix = activeTag ? `?tag=${encodeURIComponent(activeTag)}` : '';
    apiFetch(`/products${suffix}`)
      .then((rows) => setProducts(rows))
      .catch((err) => setMessage(err.message));
  }, [activeTag]);

  useEffect(() => {
    if (!addProductId || !products.length) return;
    const product = products.find((item) => item.id === addProductId);
    if (product) addToCart(product);
  }, [addProductId, products]);

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      const next = existing
        ? current.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1, product } : item)
        : [...current, { productId: product.id, quantity: 1, product }];
      saveCart(next);
      return next;
    });
  }

  function removeFromCart(productId) {
    setCart((current) => {
      const next = current.filter((item) => item.productId !== productId);
      saveCart(next);
      return next;
    });
  }

  const categories = useMemo(() => {
    const rows = products.map((product) => product.category?.name).filter(Boolean);
    return ['all', ...new Set(rows)];
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter((product) => product.category?.name === activeCategory);
  }, [products, activeCategory]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0), [cart]);
  const shippingPreview = useMemo(() => subtotal ? 'Calculated at secure checkout' : 'Select products to calculate shipping', [subtotal]);
  const branding = tenantProfile?.branding || {};
  const freeShippingThreshold = Number(branding.freeShippingThreshold || 0);
  const promoBannerEnabled = Boolean(branding.promoBannerEnabled && branding.promoBanner);
  const countdownEnabled = Boolean(branding.countdownEnabled && branding.saleEndsAt);
  const lowStockEnabled = Boolean(branding.lowStockEnabled);
  const freeShippingEnabled = Boolean(branding.freeShippingEnabled && freeShippingThreshold > 0);
  const bundleDiscountsEnabled = Boolean(branding.bundleDiscountsEnabled);
  const qualifiesForFreeShipping = freeShippingEnabled && subtotal / 100 >= freeShippingThreshold;

  function startCheckout() {
    if (!cart.length) return;
    saveCart(cart);
    router.push('/checkout');
  }

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="catalog-layout">
        <aside className="card filter-panel">
          <div className="panel-header">
            <div>
              <span className="badge">Catalog</span>
              <h2 style={{ margin: '10px 0 0' }}>Categories</h2>
            </div>
          </div>

          <div className="filter-list">
            {categories.map((category) => (
              <button key={category} onClick={() => setActiveCategory(category)}>
                {category === 'all' ? 'All Products' : category}
              </button>
            ))}
          </div>

          <div className="subtle-divider" />
          <div className="field" style={{ marginTop: 16 }}>
            <label>Region</label>
            <div className="filter-list">
              <button type="button">Canada</button>
              <button type="button">United States</button>
            </div>
          </div>

          <div className="field">
            <label>Tagged filter</label>
            {activeTag ? (
              <div className="badge">{activeTag} <Link href="/catalog" style={{ marginLeft: 6 }}>clear</Link></div>
            ) : <div className="muted small">Browse tags on product cards to refine inventory.</div>}
          </div>

          <div className="field">
            <label>Price</label>
            <div className="filter-list">
              <button type="button">$0 – $50</button>
              <button type="button">$50 – $150</button>
              <button type="button">$150+</button>
            </div>
          </div>
        </aside>

        <div className="catalog-main">
          <section className="card">
            <div className="store-header">
              <div>
                <h1 className="page-title" style={{ fontSize: '2.4rem' }}>Product Store</h1>
                <p className="lead" style={{ maxWidth: 620 }}>
                  Moving supplies, furniture accessories, and logistics gear with weight-aware shipping and Stripe checkout.
                </p>
              </div>
              <div className="badge badge-gold">Powered by Loadlyx Payments</div>
            </div>

            {message ? <p className="error" style={{ marginTop: 12 }}>{message}</p> : null}

            {promoBannerEnabled ? <div className="promo-banner">{branding.promoBanner}</div> : null}
            {countdownEnabled ? <CountdownTimer endsAt={branding.saleEndsAt} label="Sale ends in" /> : null}
            {branding.trustHeadline ? (
              <div className="tenant-trust-banner">
                <strong>{branding.trustHeadline}</strong>
                <span className="muted">{branding.trustCopy || 'Branded tenant messaging appears here for customer confidence.'}</span>
              </div>
            ) : null}

            <div className="store-products" style={{ marginTop: 18 }}>
              {visibleProducts.map((product) => (
                <article className="card product-card" key={product.id}>
                  <span className="badge">{product.category?.name || 'Uncategorized'}</span>
                  <div className="product-image">
                    {product.primaryImage?.url ? (
                      <img src={product.primaryImage.url} alt={product.primaryImage.altText || product.name} loading="lazy" />
                    ) : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#8ca4d1' }}>No image</div>}
                  </div>
                  <div className="product-meta">
                    <div>
                      <h3 className="product-title">{product.name}</h3>
                      <div className="rating">★★★★★ <span className="muted">(catalog)</span></div>
                    </div>
                    <div className="price">${(product.priceCents / 100).toFixed(2)}</div>
                  </div>
                  <div className="product-urgency">
                    {lowStockEnabled && product.stock > 0 && product.stock <= 5 ? <span className="badge badge-gold">Only {product.stock} left</span> : null}
                    {freeShippingEnabled ? <span className="badge">Free shipping over ${freeShippingThreshold}</span> : null}
                    {bundleDiscountsEnabled ? <span className="badge">Bundle savings available</span> : null}
                  </div>
                  <p className="muted" style={{ margin: 0 }}>{product.description}</p>
                  <div className="muted small">Weight: {Number(product.weightKg).toFixed(2)} kg</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(product.tags || []).map((tag) => (
                      <Link key={tag.id} href={`/catalog?tag=${tag.slug}`} className="badge">{tag.name}</Link>
                    ))}
                  </div>
                  <div className="product-actions">
                    <button className="btn" onClick={() => addToCart(product)}>Add to Cart</button>
                    <Link className="btn secondary" href={`/products/${product.slug}`}>View Product</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="card store-promo">
            <div>
              <span className="badge badge-gold">Sponsored by</span>
              <h3 style={{ margin: '10px 0 8px' }}>Loadlyx Payments</h3>
              <p className="lead" style={{ maxWidth: 560, margin: 0 }}>
                No monthly gateway fee. Track store orders, shipping logic, attribution, and product revenue from one admin panel.
              </p>
            </div>
          </section>

          <section className="card checkout-card">
            <div className="panel-header">
              <div>
                <span className="badge">Secure Cart</span>
                <h2 style={{ margin: '10px 0 0' }}>Checkout Preview</h2>
              </div>
              <div className="badge badge-gold">Stripe-ready</div>
            </div>

            {!cart.length ? <p className="muted">Your cart is empty. Add products to start checkout.</p> : (
              <>
                <div className="stack-sm">
                  {cart.map((item) => (
                    <div className="summary-line" key={item.productId}>
                      <div>
                        <strong>{item.product.name}</strong>
                        <div className="muted small">Qty {item.quantity}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div>${((item.product.priceCents * item.quantity) / 100).toFixed(2)}</div>
                        <button onClick={() => removeFromCart(item.productId)} className="btn ghost" style={{ padding: '8px 10px', marginTop: 8 }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="summary-line" style={{ marginTop: 18 }}>
                  <span className="muted">Subtotal</span>
                  <span>${(subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="summary-line">
                  <span className="muted">Shipping</span>
                  <span>{qualifiesForFreeShipping ? 'Free shipping unlocked' : shippingPreview}</span>
                </div>
                <div className="total-line">
                  <span>Total</span>
                  <span>${(subtotal / 100).toFixed(2)}+</span>
                </div>

                <div className="action-row" style={{ marginTop: 18 }}>
                  <button className="btn" onClick={startCheckout}>Continue to Secure Checkout</button>
                  <Link className="btn secondary" href="/quote">Need a move quote?</Link>
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
export default function CatalogPage() {
return (
<Suspense fallback={<main style={{ padding: 32 }}>Loading catalog...</main>}>
<CatalogPageContent />
</Suspense>
);
}