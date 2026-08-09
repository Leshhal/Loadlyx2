'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { getTenantSlug as resolveTenantSlug } from '@/lib/tenant';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import CountdownTimer from '../../components/CountdownTimer';
import { Drawer, EmptyState } from '../../components/ui/LoadlyxUI';

function getTenantSlug() {
return resolveTenantSlug();
}

function getCartStorageKey() {
return `loadlyx_cart_${getTenantSlug() || 'default'}`;
}

function saveCart(nextCart) {
if (typeof window === 'undefined') return;
window.localStorage.setItem(getCartStorageKey(), JSON.stringify(nextCart));
window.dispatchEvent(new CustomEvent('loadlyx:cart-updated', { detail: nextCart }));
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
  const tenantSlug = getTenantSlug();
  const tenantBase = tenantSlug ? `/tenant/${tenantSlug}` : '';
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState('');
  const [tenantProfile, setTenantProfile] = useState(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTag = searchParams.get('tag');
  const addProductId = searchParams.get('add');
  const requestedCategory = searchParams.get('category') || 'all';
  const [activeCategory, setActiveCategory] = useState(requestedCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRegion, setActiveRegion] = useState('all');
  const [priceBand, setPriceBand] = useState('all');
  const [wishlist, setWishlist] = useState([]);
  const [quickView, setQuickView] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    setCart(loadCart());
    try { setWishlist(JSON.parse(window.localStorage.getItem('loadlyx_store_wishlist') || '[]')); } catch {}
  }, []);

  useEffect(() => {
    setActiveCategory(requestedCategory);
  }, [requestedCategory]);

  useEffect(() => {
    apiFetch(`/tenant/by-slug/${getTenantSlug()}`)
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

  function changeQuantity(productId, delta) {
    setCart((current) => {
      const next = current.map((item) => item.productId === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item);
      saveCart(next);
      return next;
    });
  }

  function toggleWishlist(productId) {
    setWishlist((current) => { const next = current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]; window.localStorage.setItem('loadlyx_store_wishlist', JSON.stringify(next)); return next; });
  }

  function addKitToCart(items) {
    setCart((current) => {
      let next = [...current];
      items.forEach((product) => { const existing = next.find((item) => item.productId === product.id); next = existing ? next.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1, product } : item) : [...next, { productId: product.id, quantity: 1, product }]; });
      saveCart(next); return next;
    });
    setMessage(`${items.length} recommended products added to your cart.`);
    setCartOpen(true);
  }

  const categories = useMemo(() => {
    const rows = products.map((product) => product.category?.name).filter(Boolean);
    return ['all', ...new Set(rows)];
  }, [products]);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = activeCategory === 'all' || product.category?.name === activeCategory;
      const searchMatch = !searchQuery || `${product.name} ${product.description} ${product.category?.name || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
      const region = String(product.region || product.country || product.tenant?.country || '').toUpperCase();
      const regionMatch = activeRegion === 'all' || !region || region === activeRegion;
      const price = Number(product.priceCents || 0);
      const priceMatch = priceBand === 'all' || (priceBand === 'under50' && price < 5000) || (priceBand === '50to150' && price >= 5000 && price <= 15000) || (priceBand === 'over150' && price > 15000);
      return categoryMatch && regionMatch && priceMatch && searchMatch;
    });
  }, [products, activeCategory, activeRegion, priceBand, searchQuery]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0), [cart]);
  const recommendedKit = useMemo(() => { const chosen = []; const seen = new Set(); products.forEach((product) => { const key = product.category?.name || product.id; if (!seen.has(key) && chosen.length < 4 && Number(product.stock ?? 1) !== 0) { seen.add(key); chosen.push(product); } }); return chosen; }, [products]);
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
    router.push(tenantSlug ? `${tenantBase}/checkout?cart=1` : '/checkout');
  }

  return (
    <main className="container grid lx-storefront" style={{ gap: 24 }}>
      <section className="lx-store-hero">
        <div><span className="lx-eyebrow">Moving supplies, connected to the move</span><h1>{branding.brandName || tenantProfile?.name || 'The Loadlyx Store'}</h1><p>Shop protection, packing, and moving essentials from a tenant storefront designed to work alongside quotes, bookings, and delivery.</p><div className="lx-store-search"><span aria-hidden="true">⌕</span><input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products and moving supplies" aria-label="Search storefront products" /></div><div className="lx-trust-row"><span>✓ Tenant storefront</span><span>✓ Secure checkout</span><span>✓ Inventory-aware</span><button type="button" className="btn ghost" onClick={() => setCartOpen(true)}>Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})</button></div></div>
        <aside className="lx-concierge-card"><span className="lx-eyebrow">Move-kit concierge</span><h2>Not sure what your move needs?</h2><p>Start with the move details already supported by Loadlyx. Your quote can guide a coordinated supply plan without guessing through the catalog.</p><Link className="btn" href={`${tenantBase}/quote`}>Describe your move</Link><small>Recommendations require review before products are added.</small></aside>
      </section>
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
              <button type="button" className={activeRegion === 'CA' ? 'active' : ''} onClick={() => setActiveRegion(activeRegion === 'CA' ? 'all' : 'CA')}>Canada</button>
              <button type="button" className={activeRegion === 'US' ? 'active' : ''} onClick={() => setActiveRegion(activeRegion === 'US' ? 'all' : 'US')}>United States</button>
            </div>
          </div>

          <div className="field">
            <label>Tagged filter</label>
            {activeTag ? (
              <div className="badge">{activeTag} <Link href={`${tenantBase}/catalog`} style={{ marginLeft: 6 }}>clear</Link></div>
            ) : <div className="muted small">Browse tags on product cards to refine inventory.</div>}
          </div>

          <div className="field">
            <label>Price</label>
            <div className="filter-list">
              <button type="button" className={priceBand === 'under50' ? 'active' : ''} onClick={() => setPriceBand(priceBand === 'under50' ? 'all' : 'under50')}>$0 – $50</button>
              <button type="button" className={priceBand === '50to150' ? 'active' : ''} onClick={() => setPriceBand(priceBand === '50to150' ? 'all' : '50to150')}>$50 – $150</button>
              <button type="button" className={priceBand === 'over150' ? 'active' : ''} onClick={() => setPriceBand(priceBand === 'over150' ? 'all' : 'over150')}>$150+</button>
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

            {recommendedKit.length ? <section className="lx-dynamic-kit"><div><span className="lx-eyebrow">Dynamic moving kit</span><h2>Balanced essentials from current inventory</h2><p>This editable recommendation selects one available product from up to four catalog categories. Review every item before checkout.</p><div>{recommendedKit.map((product) => <span key={product.id}>{product.name}</span>)}</div></div><aside><strong>${(recommendedKit.reduce((sum, product) => sum + product.priceCents, 0) / 100).toFixed(2)}</strong><button type="button" className="btn" onClick={() => addKitToCart(recommendedKit)}>Add kit to cart</button><Link href={`${tenantBase}/quote`}>Personalize from a move quote</Link></aside></section> : null}

            <div className="store-products" style={{ marginTop: 18 }}>
              {visibleProducts.map((product) => (
                <article className="card product-card" key={product.id}>
                  <span className="badge">{product.category?.name || 'Uncategorized'}</span>
                  <div className="product-urgency">{(product.badges || []).filter((badge) => badge.badgeType !== 'PERCENTAGE' || product.salePriceCents).slice(0, 2).map((badge) => <span key={badge.id} className="badge badge-gold" title={badge.tooltip || ''}>{badge.label}</span>)}</div>
                  <Link className="product-image" href={`${tenantBase}/catalog/${product.slug}`} aria-label={`View ${product.name}`}>
                    {product.primaryImage?.url ? (
                      <img src={product.primaryImage.url} alt={product.primaryImage.altText || product.name} loading="lazy" />
                    ) : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#8ca4d1' }}>No image</div>}
                  </Link>
                  <div className="product-meta">
                    <div>
                      <h3 className="product-title"><Link href={`${tenantBase}/catalog/${product.slug}`}>{product.name}</Link></h3>
                      {product.ratingCount ? <div className="rating"><span aria-label={`${Number(product.averageRating || 0).toFixed(1)} out of 5`}>★ {Number(product.averageRating || 0).toFixed(1)}</span> <span className="muted">({product.ratingCount})</span></div> : <div className="muted small">No verified reviews yet</div>}
                    </div>
                    <div className="price">{product.productType === 'RENTAL' ? `$${(Number(product.weeklyRateCents || product.priceCents) / 100).toFixed(2)}/week` : `$${(product.priceCents / 100).toFixed(2)}`}</div>
                  </div>
                  <div className="product-urgency">
                    {lowStockEnabled && product.stock > 0 && product.stock <= 5 ? <span className="badge badge-gold">Only {product.stock} left</span> : null}
                    {freeShippingEnabled ? <span className="badge">Free shipping over ${freeShippingThreshold}</span> : null}
                    {bundleDiscountsEnabled ? <span className="badge">Bundle savings available</span> : null}
                    {/tote/i.test(`${product.name} ${(product.tags || []).map((tag) => tag.name).join(' ')}`) ? <span className="badge">Reusable tote</span> : null}
                  </div>
                  <p className="muted" style={{ margin: 0 }}>{product.description}</p>
                  {product.productType === 'RENTAL' ? <div className="tenant-trust-banner"><strong>Two-week minimum: ${(Number(product.minimumChargeCents || product.priceCents) / 100).toFixed(2)}</strong><span className="muted">Move, delivery, and pickup dates are confirmed during rental booking.</span></div> : null}
                  <div className="muted small">Weight: {Number(product.weightKg).toFixed(2)} kg</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(product.tags || []).map((tag) => (
                      <Link key={tag.id} href={`${tenantBase}/catalog?tag=${tag.slug}`} className="badge">{tag.name}</Link>
                    ))}
                  </div>
                  <div className="product-actions">
                    <button className="btn" onClick={() => addToCart(product)}>Add to Cart</button>
                    <Link className="btn secondary" href={`${tenantBase}/catalog/${product.slug}`}>View product</Link>
                    <button className="btn secondary" type="button" onClick={() => setQuickView(product)}>Quick view</button>
                    <button className="btn ghost" type="button" onClick={() => toggleWishlist(product.id)} aria-pressed={wishlist.includes(product.id)}>{wishlist.includes(product.id) ? 'Saved' : 'Wishlist'}</button>
                  </div>
                </article>
              ))}
            </div>
            {!visibleProducts.length ? <EmptyState title="No matching products" description="Change the search or filters to see more of the catalog." /> : null}
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
                  <Link className="btn secondary" href={`${tenantBase}/quote`}>Need a move quote?</Link>
                </div>
              </>
            )}
          </section>
        </div>
      </section>
      <Drawer open={Boolean(quickView)} title={quickView?.name} description={quickView?.category?.name || 'Product details'} onClose={() => setQuickView(null)} footer={quickView ? <><Link className="btn secondary" href={tenantSlug ? `${tenantBase}/catalog/${quickView.slug}` : `/products/${quickView.slug}`}>Full details</Link><button className="btn" type="button" onClick={() => { addToCart(quickView); setQuickView(null); }}>Add to cart</button></> : null}>{quickView ? <div className="grid" style={{ gap: 18 }}>{quickView.primaryImage?.url ? <img className="lx-quick-image" src={quickView.primaryImage.url} alt={quickView.primaryImage.altText || quickView.name} /> : null}<strong className="price">${(quickView.priceCents / 100).toFixed(2)}</strong><p className="muted">{quickView.description}</p><div className="lx-detail-grid"><div><span>Stock</span><strong>{quickView.stock ?? 'Not listed'}</strong></div><div><span>Weight</span><strong>{Number(quickView.weightKg || 0).toFixed(2)} kg</strong></div></div></div> : null}</Drawer>
      <Drawer open={cartOpen} title="Your moving-supply cart" description={`${cart.reduce((sum, item) => sum + item.quantity, 0)} items`} onClose={() => setCartOpen(false)} footer={cart.length ? <button className="btn" type="button" onClick={startCheckout}>Secure checkout</button> : null}>{cart.length ? <div className="grid" style={{ gap: 12 }}>{cart.map((item) => <div className="summary-line" key={item.lineKey || item.productId}><div><strong>{item.product.name}</strong><div className="action-row"><button type="button" className="btn ghost" aria-label={`Decrease ${item.product.name} quantity`} onClick={() => changeQuantity(item.productId, -1)}>−</button><span className="muted small">Quantity {item.quantity}</span><button type="button" className="btn ghost" aria-label={`Increase ${item.product.name} quantity`} onClick={() => changeQuantity(item.productId, 1)}>+</button></div></div><div><strong>${((item.product.priceCents * item.quantity) / 100).toFixed(2)}</strong><button type="button" className="btn ghost" onClick={() => removeFromCart(item.productId)}>Remove</button></div></div>)}<div className="total-line"><span>Subtotal</span><span>${(subtotal / 100).toFixed(2)}</span></div></div> : <EmptyState title="Your cart is empty" description="Add an individual product or a recommended moving kit." />}</Drawer>
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
