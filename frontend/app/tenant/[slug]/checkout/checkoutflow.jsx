'use client';

import { useEffect, useMemo, useState } from 'react';
import { storefrontPaymentMethodState } from '@/lib/storePaymentMethods';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const TERMINAL_CRYPTO = new Set(['PAID', 'OVERPAID', 'EXPIRED', 'FAILED', 'REFUNDED']);



export default function CheckoutFlow({ product, tenantSlug, initialQty }) {
  const [step, setStep] = useState('summary');
  const [quantity, setQuantity] = useState(Math.max(1, Number(initialQty || 1)));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('CA');
  const [province, setProvince] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cryptoAsset, setCryptoAsset] = useState('ADA');
  const [cryptoInvoice, setCryptoInvoice] = useState(null);
  const priceCents = Number(product.priceCents || Math.round(Number(product.price || 0) * 100));
  const subtotalCents = priceCents * quantity;
  const availability = useMemo(() => ({ card: storefrontPaymentMethodState(paymentMethods, 'card'), paypal: storefrontPaymentMethodState(paymentMethods, 'paypal'), crypto: storefrontPaymentMethodState(paymentMethods, 'crypto') }), [paymentMethods]);

  useEffect(() => {
    fetch(`${API_URL}/orders/payment-methods`, { headers: { 'x-tenant-slug': tenantSlug } })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body; })
      .then((methods) => { setPaymentMethods(methods); const crypto = storefrontPaymentMethodState(methods, 'crypto'); if (crypto.assets?.length) setCryptoAsset(crypto.assets[0]); })
      .catch(() => setPaymentMethods({ card: { status: 'CONFIGURATION REQUIRED' }, paypal: { status: 'CONFIGURATION REQUIRED' }, crypto: { status: 'DISABLED', acceptedAssets: [] } }));
  }, [tenantSlug]);

  useEffect(() => {
    if (!cryptoInvoice?.id || TERMINAL_CRYPTO.has(cryptoInvoice.status)) return undefined;
    const timer = window.setInterval(async () => { const response = await fetch(`${API_URL}/crypto/invoices/${cryptoInvoice.id}`); if (response.ok) setCryptoInvoice(await response.json()); }, 5000);
    return () => window.clearInterval(timer);
  }, [cryptoInvoice]);

  async function handleProviderCheckout() {
    setError(''); setLoading(true);
    try {
      const response = await fetch(`${API_URL}/orders/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-tenant-slug': tenantSlug }, body: JSON.stringify({ customerName: name, customerEmail: email, shippingCountry: country, shippingProvince: country === 'CA' ? province : undefined, shippingState: country === 'US' ? province : undefined, paymentMethod: paymentMethod === 'paypal' ? 'PAYPAL' : 'STRIPE', items: [{ productId: product.id, quantity }] }) });
      const body = await response.json();
      if (!response.ok || !body.checkoutUrl) throw new Error(body.message || body.error || 'Payment checkout could not be started');
      window.location.href = body.checkoutUrl;
    } catch (checkoutError) { setError(checkoutError.message); setLoading(false); }
  }

  async function handleCryptoCheckout() {
    setError(''); setLoading(true);
    try {
      const response = await fetch(`${API_URL}/crypto/invoices`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-tenant-slug': tenantSlug }, body: JSON.stringify({ productSlug: product.slug, quantity, asset: cryptoAsset, name, email, country, province }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Crypto invoice could not be created');
      setCryptoInvoice(body);
    } catch (checkoutError) { setError(checkoutError.message); } finally { setLoading(false); }
  }

  const selected = availability[paymentMethod];
  return <>
    {error ? <p className="error" role="alert">{error}</p> : null}
    {step === 'summary' ? <><div style={styles.item}><div><h2 style={styles.productName}>{product.name}</h2><label style={styles.label}>Quantity</label><input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))} style={styles.input} /><p style={styles.meta}>Price: ${(priceCents / 100).toFixed(2)}</p></div><strong style={styles.total}>${(subtotalCents / 100).toFixed(2)}</strong></div><button type="button" className="tenant-pay-button" onClick={() => setStep('payment')}>Continue to payment</button></> : cryptoInvoice ? <section style={styles.cryptoInvoice}><span style={styles.cryptoBadge}>{cryptoInvoice.status}</span><h2>Send {Number(cryptoInvoice.cryptoAmount).toFixed(8)} {cryptoInvoice.asset}</h2><p style={styles.address}>{cryptoInvoice.paymentAddress}</p><p>Confirmations: {cryptoInvoice.confirmations} / {cryptoInvoice.requiredConfirmations}</p><p>Invoice expires {new Date(cryptoInvoice.expiresAt).toLocaleString()}.</p><p style={styles.meta}>Fulfilment begins only after the verified listener records the required confirmations.</p></section> : <>
      <div style={styles.form}><label style={styles.label}>Full name<input required style={styles.input} value={name} onChange={(event) => setName(event.target.value)} /></label><label style={styles.label}>Email address<input required type="email" style={styles.input} value={email} onChange={(event) => setEmail(event.target.value)} /></label><label style={styles.label}>Shipping country<select style={styles.input} value={country} onChange={(event) => setCountry(event.target.value)}><option value="CA">Canada</option><option value="US">United States</option></select></label><label style={styles.label}>{country === 'CA' ? 'Province' : 'State'}<input required style={styles.input} value={province} onChange={(event) => setProvince(event.target.value)} placeholder={country === 'CA' ? 'SK / AB / ON' : 'State'} /></label></div>
      <fieldset className="tenant-payment-methods"><legend>Choose how to pay</legend>{[
        ['card', 'Credit / debit card', 'Stripe'],
        ['paypal', 'PayPal', 'PayPal balance or eligible card'],
        ['crypto', 'Cryptocurrency', 'ADA or SOL']
      ].map(([key, title, provider]) => <label key={key} className={paymentMethod === key ? 'selected' : ''}><input type="radio" name="paymentMethod" value={key} checked={paymentMethod === key} disabled={!availability[key].enabled} onChange={() => setPaymentMethod(key)} /><span><strong>{title}</strong><small>{provider} · {availability[key].note}</small></span></label>)}</fieldset>
      {paymentMethod === 'crypto' && availability.crypto.assets?.length ? <label style={styles.label}>Blockchain<select style={styles.input} value={cryptoAsset} onChange={(event) => setCryptoAsset(event.target.value)}>{availability.crypto.assets.map((asset) => <option key={asset}>{asset}</option>)}</select></label> : null}
      <button type="button" className="tenant-pay-button" disabled={loading || !selected?.enabled || !name || !email || !province} onClick={paymentMethod === 'crypto' ? handleCryptoCheckout : handleProviderCheckout}>{loading ? 'Starting secure checkout…' : paymentMethod === 'paypal' ? 'Continue to PayPal' : paymentMethod === 'crypto' ? `Create ${cryptoAsset} payment invoice` : `Pay $${(subtotalCents / 100).toFixed(2)} with card`}</button>
      <button type="button" className="tenant-back-button" onClick={() => setStep('summary')}>Back</button>
    </>}
  </>;
}

const styles = {
  item: { marginTop: 24, padding: 20, borderRadius: 18, background: '#f8fafc', display: 'flex', justifyContent: 'space-between', gap: 20 },
  productName: { margin: 0, color: '#0f172a' }, meta: { margin: '10px 0 0', color: '#64748b' }, total: { fontSize: 24, color: '#0f172a' },
  form: { marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }, label: { display: 'grid', gap: 8, fontWeight: 800, color: '#334155' }, input: { width: '100%', padding: '13px 14px', borderRadius: 12, border: '1px solid rgba(15,23,42,.14)', fontSize: 16, boxSizing: 'border-box' },
  cryptoInvoice: { marginTop: 24, padding: 24, borderRadius: 18, background: '#f8fafc', color: '#0f172a' }, cryptoBadge: { display: 'inline-block', padding: '6px 10px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontWeight: 800 }, address: { overflowWrap: 'anywhere', padding: 12, borderRadius: 10, background: '#e2e8f0', fontFamily: 'monospace' }
};