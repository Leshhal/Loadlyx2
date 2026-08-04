'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function CheckoutFlow({ product, tenantSlug, initialQty }) {
const [step, setStep] = useState('summary');
const [quantity, setQuantity] = useState(Number(initialQty || 1));

const priceCents = Number(product.priceCents || Math.round(Number(product.price || 0) * 100));
const subtotalCents = priceCents * quantity;
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [address, setAddress] = useState('');
const [city, setCity] = useState('');
const [postalCode, setPostalCode] =useState('');
const [country, setCountry] = useState('Canada');
const [province, setProvince] = useState('');
const [error, setError] = useState('');
const [paymentMethod, setPaymentMethod] = useState('card');
const [cryptoAsset, setCryptoAsset] = useState('USDC');
const [cryptoInvoice, setCryptoInvoice] = useState(null);

useEffect(() => {
if (!cryptoInvoice?.id || ['PAID','OVERPAID','EXPIRED','FAILED','REFUNDED'].includes(cryptoInvoice.status)) return undefined;
const timer = window.setInterval(async () => {
const response = await fetch(`${API_URL}/crypto/invoices/${cryptoInvoice.id}`);
if (response.ok) setCryptoInvoice(await response.json());
}, 5000);
return () => window.clearInterval(timer);
}, [cryptoInvoice]);

const handleCheckout = async () => {
setError('');
const res = await fetch(`${API_URL}/checkout/create-session`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'x-tenant-slug': tenantSlug
},
body: JSON.stringify({
productSlug: product.slug,
quantity,
name,
email,
country,
province,
address,
city,
postalCode
})
});

const data = await res.json();

if (!res.ok || !data.url) return setError(data.error || 'Stripe checkout URL was not returned');
window.location.href = data.url;
};

const handleCryptoCheckout = async () => {
setError('');
const res = await fetch(`${API_URL}/crypto/invoices`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-tenant-slug': tenantSlug }, body: JSON.stringify({ productSlug: product.slug, quantity, asset: cryptoAsset, name, email, country: country === 'Canada' ? 'CA' : 'US', province, address, city, postalCode }) });
const data = await res.json();
if (!res.ok) return setError(data.error || 'Crypto invoice could not be created');
setCryptoInvoice(data);
};

return (
<>
{error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
{step === 'summary' ? (
<>
<div style={styles.item}>
<div>
<h2 style={styles.productName}>{product.name}</h2>

<label style={styles.label}>Quantity</label>
<input
type="number"
min="1"
value={quantity}
onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))}
style={styles.input}
/>

<p style={styles.meta}>Price: ${(priceCents / 100).toFixed(2)}</p>
</div>

<strong style={styles.total}>${(subtotalCents / 100).toFixed(2)}</strong>
</div>

<button type="button" style={styles.button} onClick={() => setStep('payment')}>
Continue to Payment
</button>
</>
) : (
<>
{cryptoInvoice ? <section style={styles.cryptoInvoice}><span style={styles.cryptoBadge}>{cryptoInvoice.status}</span><h2>Send {Number(cryptoInvoice.cryptoAmount).toFixed(8)} {cryptoInvoice.asset}</h2><p style={styles.address}>{cryptoInvoice.paymentAddress}</p><p>Confirmations: {cryptoInvoice.confirmations} / {cryptoInvoice.requiredConfirmations}</p><p>Invoice expires {new Date(cryptoInvoice.expiresAt).toLocaleString()}.</p><p style={styles.meta}>Order fulfilment begins only after the required confirmations are reached.</p></section> : <>
<div style={styles.form}>
<label style={styles.label}>Full Name</label>
<input
style={styles.input}
value={name}
onChange={(e) => setName(e.target.value)}
/>

<label style={styles.label}>Email Address</label>
<input
type="email"
style={styles.input}
value={email}
onChange={(e) => setEmail(e.target.value)}
/>

<label style={styles.label}>Shipping Country</label>
<select style={styles.input} value={country} onChange={(e) => setCountry(e.target.value)}>
<option>Canada</option>
<option>United States</option>
</select>
<label style={styles.label}>Street Address</label>
<input
style={styles.input}
placeholder="Enter Shipping Street Address"
value={address}
onChange={(e) => setAddress(e.target.value)}
/>
<label style={styles.label}>City</label>
<input
style={styles.input}
placeholder="Enter Shipping City"
value={city}
onChange={(e) => setCity(e.target.value)}
/>

<label style={styles.label}>Postal Code</label>
<input
style={styles.input}
placeholder="X0X 0X0"
value={postalCode}
onChange={(e) => setPostalCode(e.target.value)}
/>
<label style={styles.label}>Province</label>
<input
placeholder="SK / AB / ON"
style={styles.input}
value={province}
onChange={(e) => setProvince(e.target.value)}
/>

<label style={styles.label}>Payment method</label>
<select style={styles.input} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="card">Credit or debit card</option><option value="crypto">Cryptocurrency</option></select>
{paymentMethod === 'crypto' ? <><label style={styles.label}>Crypto asset</label><select style={styles.input} value={cryptoAsset} onChange={(e) => setCryptoAsset(e.target.value)}>{['BTC','ETH','SOL','ADA','USDC','USDT'].map((asset) => <option key={asset}>{asset}</option>)}</select></> : null}

</div>

<button
type="button"
style={styles.button}
onClick={paymentMethod === 'crypto' ? handleCryptoCheckout : handleCheckout}
>
{paymentMethod === 'crypto' ? 'Create Crypto Invoice' : `Pay $${(subtotalCents / 100).toFixed(2)}`}
</button>

<button type="button" style={styles.secondaryButton} onClick={() => setStep('summary')}>
Back
</button>
</>}
</>
)}
</>
);
}

const styles = {
item: {
marginTop: 24,
padding: 20,
borderRadius: 18,
background: '#f8fafc',
display: 'flex',
justifyContent: 'space-between',
gap: 20
},
productName: {
margin: 0,
color: '#0f172a'
},
meta: {
margin: '10px 0 0',
color: '#64748b'
},
total: {
fontSize: 24,
color: '#0f172a'
},
form: {
marginTop: 24,
display: 'grid',
gap: 12
},
label: {
fontWeight: 800,
color: '#334155',
marginTop: 12
},
input: {
padding: '13px 14px',
borderRadius: 12,
border: '1px solid rgba(15,23,42,0.14)',
fontSize: 16
},
button: {
marginTop: 24,
width: '100%',
background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
color: '#fff',
border: 'none',
borderRadius: 16,
padding: '16px 22px',
fontSize: 16,
fontWeight: 900,
cursor: 'pointer'
},
secondaryButton: {
marginTop: 12,
width: '100%',
background: '#fff',
color: '#0f172a',
border: '1px solid rgba(15,23,42,0.12)',
borderRadius: 16,
padding: '14px 22px',
fontSize: 16,
fontWeight: 900,
cursor: 'pointer'
},
cryptoInvoice: { marginTop: 24, padding: 24, borderRadius: 18, background: '#f8fafc', color: '#0f172a' },
cryptoBadge: { display: 'inline-block', padding: '6px 10px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontWeight: 800 },
address: { overflowWrap: 'anywhere', padding: 12, borderRadius: 10, background: '#e2e8f0', fontFamily: 'monospace' }
};
