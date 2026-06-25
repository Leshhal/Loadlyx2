'use client';

import { getTenantSlug as resolveTenantSlug } from '@/lib/tenant';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { getAttributionData } from '../../lib/attribution';

function getTenantSlug() {
return resolveTenantSlug ();
}

function getCartStorageKey() {
return `loadlyx_cart_${getTenantSlug() || 'default'}`;
}

function loadCart() {
if (typeof window === 'undefined') return [];
try {
return JSON.parse(window.localStorage.getItem(getCartStorageKey()) || '[]');
} catch {
return [];
}
}

export default function CheckoutPage() {
const [cart, setCart] = useState([]);
const [form, setForm] = useState({
customerName: '',
customerEmail: '',
shippingCountry: 'CA',
shippingProvince: '',
shippingState: ''
});
const [message, setMessage] = useState('');
const [loading, setLoading] = useState(false);
const [shippingPreviewData, setShippingPreviewData] = useState(null);

useEffect(() => {
setCart(loadCart());
}, []);

const subtotal = useMemo(
() => cart.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0),
[cart]
);

useEffect(() => {
if (!cart.length) return;
apiFetch('/shipping/quote', {
method: 'POST',
body: JSON.stringify({
country: form.shippingCountry,
province: form.shippingProvince,
state: form.shippingState,
items: cart.map((item) => ({ weightKg: item.product.weightKg, quantity: item.quantity }))
})
})
.then(setShippingPreviewData)
.catch(() => setShippingPreviewData(null));
}, [cart, form.shippingCountry, form.shippingProvince, form.shippingState]);

async function submitCheckout(e) {
e.preventDefault();
if (!cart.length) return;

setLoading(true);
setMessage('');

try {
const result = await apiFetch('/orders/checkout', {
method: 'POST',
body: JSON.stringify({
...form,
items: cart.map(({ productId, quantity }) => ({ productId, quantity })),
attribution: getAttributionData()
})
});

if (result.checkoutUrl) {
window.location.href = result.checkoutUrl;
return;
}

setMessage(result.message || 'Order saved.');
} catch (err) {
setMessage(err.message);
} finally {
setLoading(false);
}
}

return (
<main className="container grid" style={{ gap: 24 }}>
<section className="checkout-grid">
<div className="card">
<div className="panel-header">
<div>
<span className="badge">Secure checkout</span>
<h1 className="page-title" style={{ fontSize: '2.2rem' }}>
Loadlyx Secure Checkout
</h1>
<p className="lead" style={{ maxWidth: 560 }}>
Review your order, shipping destination, and launch Stripe checkout securely.
</p>
</div>
<div className="badge badge-gold">Powered by Stripe</div>
</div>

{cart.length === 0 ? (
<p className="muted">
Your cart is empty. Return to the store and add products.
</p>
) : (
<div className="stack-sm">
{cart.map((item) => (
<div className="summary-line" key={item.productId}>
<div>
<strong>
{item.product.name} × {item.quantity}
</strong>
<div className="muted small">
{item.product.sku || 'Loadlyx catalog item'}
</div>
</div>
<span>
${((item.product.priceCents * item.quantity) / 100).toFixed(2)}
</span>
</div>
))}

<div className="summary-line">
<span className="muted">Subtotal</span>
<span>${(subtotal / 100).toFixed(2)}</span>
</div>

<div className="summary-line">
<span className="muted">Shipping</span>
<span>{shippingPreviewData?.recommended ? `$${(shippingPreviewData.recommended.shippingCents / 100).toFixed(2)} (${shippingPreviewData.recommended.provider})` : 'Calculated after checkout starts'}</span>
</div>

{shippingPreviewData?.quotes?.length ? (
  <div className="shipping-options">
    {shippingPreviewData.quotes.map((quote) => (
      <div key={`${quote.provider}-${quote.method}`} className="shipping-option">
        <strong>{quote.provider.toUpperCase()}</strong>
        <span>{quote.service}</span>
        <span>${(quote.shippingCents / 100).toFixed(2)}</span>
      </div>
    ))}
  </div>
) : null}

<div className="total-line">
<span>Total</span>
<span>${((subtotal + (shippingPreviewData?.recommended?.shippingCents || 0)) / 100).toFixed(2)}</span>
</div>
</div>
)}
</div>

<div className="card">
<form className="grid" style={{ gap: 14 }} onSubmit={submitCheckout}>
<div className="field">
<label>Full Name</label>
<input
value={form.customerName}
onChange={(e) =>
setForm({ ...form, customerName: e.target.value })
}
required
/>
</div>

<div className="field">
<label>Email Address</label>
<input
type="email"
value={form.customerEmail}
onChange={(e) =>
setForm({ ...form, customerEmail: e.target.value })
}
required
/>
</div>

<div className="field">
<label>Shipping Country</label>
<select
value={form.shippingCountry}
onChange={(e) =>
setForm({ ...form, shippingCountry: e.target.value })
}
>
<option value="CA">Canada</option>
<option value="US">United States</option>
</select>
</div>

{form.shippingCountry === 'CA' ? (
<div className="field">
<label>Province</label>
<input
value={form.shippingProvince}
onChange={(e) =>
setForm({
...form,
shippingProvince: e.target.value,
shippingState: ''
})
}
placeholder="SK / AB / ON"
/>
</div>
) : (
<div className="field">
<label>State</label>
<input
value={form.shippingState}
onChange={(e) =>
setForm({
...form,
shippingState: e.target.value,
shippingProvince: ''
})
}
placeholder="ND / WA / TX"
/>
</div>
)}

<button className="btn" type="submit" disabled={loading || !cart.length}>
{loading ? 'Starting checkout…' : `Pay $${(subtotal / 100).toFixed(2)}+`}
</button>

<div className="muted small">
Secure 256-bit encryption · Stripe hosted checkout · weight-based shipping logic
</div>

{message ? <p className="success">{message}</p> : null}
</form>
</div>
</section>
</main>
);
}
