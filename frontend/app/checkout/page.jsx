'use client';

import { getTenantSlug as resolveTenantSlug } from '@/lib/tenant';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { getAttributionData } from '../../lib/attribution';
import { storefrontPaymentMethodState } from '../../lib/storePaymentMethods';
import { launchAffirmCheckout } from '../../lib/affirmCheckout';

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
shippingState: '',
shippingAddressLine1: '',
shippingCity: '',
shippingPostalCode: ''
});
const [message, setMessage] = useState('');
const [loading, setLoading] = useState(false);
const [shippingPreviewData, setShippingPreviewData] = useState(null);
const [paymentMethods, setPaymentMethods] = useState(null);
const [paymentMethod, setPaymentMethod] = useState('STRIPE');

useEffect(() => {
setCart(loadCart());
apiFetch('/orders/payment-methods').then((methods) => { setPaymentMethods(methods); const card = storefrontPaymentMethodState(methods, 'card'); const paypal = storefrontPaymentMethodState(methods, 'paypal'); const affirm = storefrontPaymentMethodState(methods, 'affirm'); if (!card.enabled && paypal.enabled) setPaymentMethod('PAYPAL'); else if (!card.enabled && !paypal.enabled && affirm.enabled) setPaymentMethod('AFFIRM'); }).catch(() => setPaymentMethods(null));
}, []);

const subtotal = useMemo(
() => cart.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0),
[cart]
);
const availability = useMemo(() => ({ card: storefrontPaymentMethodState(paymentMethods, 'card'), paypal: storefrontPaymentMethodState(paymentMethods, 'paypal'), affirm: storefrontPaymentMethodState(paymentMethods, 'affirm') }), [paymentMethods]);

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
paymentMethod,
items: cart.map(({ productId, quantity }) => ({ productId, quantity })),
attribution: getAttributionData()
})
});

if (result.provider === 'AFFIRM' && result.affirm) { launchAffirmCheckout(result.affirm, async ({ checkout_token: checkoutToken }) => { const confirmation = await apiFetch('/orders/affirm/' + result.orderId + '/authorize', { method: 'POST', body: JSON.stringify({ checkoutToken }) }); window.location.href = '/checkout/success?affirm_order_id=' + confirmation.order.id; }, (affirmError) => { setMessage(affirmError?.message || 'Affirm checkout was not completed'); setLoading(false); }); return; }

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
Review your order, shipping destination, and choose an available secure payment method.
</p>
</div>
<div className="badge badge-gold">Secure payment options</div>
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
{paymentMethods ? <div className="grid" style={{ gap: 10, marginBottom: 18 }}><strong>Choose a payment method</strong><div className="payment-availability"><span className={`badge ${availability.card.enabled ? 'available' : 'unavailable'}`}>Card · {availability.card.enabled ? 'Available' : availability.card.note}</span><span className={`badge ${availability.paypal.enabled ? 'available' : 'unavailable'}`}>PayPal · {availability.paypal.enabled ? 'Available' : availability.paypal.note}</span><span className={availability.affirm.enabled ? 'badge available' : 'badge unavailable'}>Affirm · {availability.affirm.enabled ? 'Available' : availability.affirm.note}</span></div></div> : <p className="muted small">Checking available payment methods…</p>}
<form className="grid" style={{ gap: 14 }} onSubmit={submitCheckout}>
<div className="field"><label>Payment method</label><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="STRIPE" disabled={!availability.card.enabled}>Credit or debit card</option><option value="PAYPAL" disabled={!availability.paypal.enabled}>PayPal</option><option value="AFFIRM" disabled={!availability.affirm.enabled}>Pay over time with Affirm</option></select></div>
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

<div className="field"><label>Shipping Address</label><input value={form.shippingAddressLine1} onChange={(e) => setForm({ ...form, shippingAddressLine1: e.target.value })} required={paymentMethod === 'AFFIRM'} autoComplete="shipping street-address"/></div>
<div className="field"><label>City</label><input value={form.shippingCity} onChange={(e) => setForm({ ...form, shippingCity: e.target.value })} required={paymentMethod === 'AFFIRM'} autoComplete="shipping address-level2"/></div>
<div className="field"><label>Postal / ZIP Code</label><input value={form.shippingPostalCode} onChange={(e) => setForm({ ...form, shippingPostalCode: e.target.value })} required={paymentMethod === 'AFFIRM'} autoComplete="shipping postal-code"/></div>
{form.shippingCountry === 'CA' ? (
<div className="field">
<label>Province</label>
<input
value={form.shippingProvince}
onChange={(e) =>
setForm({
...form,
shippingProvince: e.target.value,
shippingState: '',
shippingAddressLine1: '',
shippingCity: '',
shippingPostalCode: ''
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

<button className="btn" type="submit" disabled={loading || !cart.length || (paymentMethod === 'STRIPE' ? !availability.card.enabled : paymentMethod === 'PAYPAL' ? !availability.paypal.enabled : !availability.affirm.enabled)}>
{loading ? 'Starting checkout…' : `Pay $${(subtotal / 100).toFixed(2)}+`}
</button>

<div className="muted small">
Secure payment processing · Shipping confirmed before payment
</div>

{message ? <p className="success">{message}</p> : null}
</form>
</div>
</section>
</main>
);
}
