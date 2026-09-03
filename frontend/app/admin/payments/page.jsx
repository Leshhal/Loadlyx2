'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '../../../lib/adminFetch';
import { ErrorState, LoadingState, PageHeader, StatusBadge } from '../../../components/ui/LoadlyxUI';

export default function PaymentSettingsPage() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ stripeEnabled: false, paypalEnabled: false, paypalMerchantId: '', payoutMethod: '', payoutDestinationLabel: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const response = await adminFetch('/payment-settings');
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Unable to load payment settings');
    setData(body);
    if (body.scope === 'TENANT') setForm({
      stripeEnabled: Boolean(body.settings.stripeEnabled),
      paypalEnabled: Boolean(body.settings.paypalEnabled),
      paypalMerchantId: body.settings.paypalMerchantId || '',
      payoutMethod: body.settings.payoutMethod || '',
      payoutDestinationLabel: body.settings.payoutDestinationLabel || ''
    });
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  async function save(event) {
    event.preventDefault(); setError(''); setMessage('');
    const response = await adminFetch('/payment-settings', { method: 'PUT', body: JSON.stringify(form) });
    const body = await response.json();
    if (!response.ok) return setError(body.error || 'Unable to save settings');
    setData((current) => ({ ...current, settings: { ...current.settings, ...body.settings } }));
    setMessage('Payment settings saved.');
  }

  if (error) return <main className="container"><ErrorState message={error} /></main>;
  if (!data) return <main className="container"><LoadingState label="Loading payment settings" /></main>;
  if (data.scope === 'PLATFORM') return <main className="container"><PageHeader eyebrow="Platform integrations" title="Payments and payouts" description="Global provider readiness. Tenant secrets are never displayed." /><div className="grid grid-3">{Object.entries(data.providers || {}).map(([name, provider]) => <section className="card" key={name}><h2>{name.toUpperCase()}</h2><StatusBadge tone={provider.status === 'CONFIGURED' ? 'success' : 'warning'}>{provider.status}</StatusBadge><pre className="muted small" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(provider, null, 2)}</pre></section>)}</div></main>;

  const stripeAuthorized = data.settings.stripePolicy === 'PLATFORM_STRIPE_ALLOWED';
  return <main className="container">
    <PageHeader eyebrow="Tenant finance" title="Payments and payouts" description="Control the payment methods shown at this tenant's checkout. Provider secrets remain server-side." actions={<Link className="btn secondary" href="/admin/balance">Open ledger & withdrawals</Link>} />
    <form className="grid two" style={{ gap: 20 }} onSubmit={save}>
      <section className="card"><h2>Stripe</h2><p><StatusBadge tone={data.stripe.available ? 'success' : 'warning'}>{data.stripe.status}</StatusBadge></p><p className="muted">Authorized: {stripeAuthorized ? 'Yes' : 'No'} · Mode: {data.stripe.mode}</p><label><input type="checkbox" checked={form.stripeEnabled} disabled={!stripeAuthorized || data.stripe.mode === 'CONFIGURATION REQUIRED'} onChange={(event) => setForm({ ...form, stripeEnabled: event.target.checked })} /> Accept Stripe payments</label></section>
      <section className="card"><h2>PayPal</h2><p><StatusBadge tone={data.paypal.available ? 'success' : 'warning'}>{data.paypal.status}</StatusBadge></p><p className="muted">Mode: {data.paypal.mode}</p><label><input type="checkbox" checked={form.paypalEnabled} disabled={data.paypal.status === 'CONFIGURATION REQUIRED' && !form.paypalEnabled} onChange={(event) => setForm({ ...form, paypalEnabled: event.target.checked })} /> Accept PayPal</label><label>PayPal merchant ID<input value={form.paypalMerchantId} onChange={(event) => setForm({ ...form, paypalMerchantId: event.target.value })} placeholder="Merchant ID (never a secret key)" /></label></section>
      <section className="card"><h2>Payout preference</h2><label>Preferred payout method<select value={form.payoutMethod} onChange={(event) => setForm({ ...form, payoutMethod: event.target.value })}><option value="">Choose a method</option><option value="STRIPE">Stripe</option><option value="PAYPAL">PayPal</option><option value="MANUAL">Manual bank payout</option></select></label><label>Destination label<input value={form.payoutDestinationLabel} onChange={(event) => setForm({ ...form, payoutDestinationLabel: event.target.value })} placeholder="Example: Business account ending 1234" /></label></section>
      <div><button className="btn" type="submit">Save payment settings</button>{message ? <p className="success" role="status">{message}</p> : null}</div>
    </form>
  </main>;
}
