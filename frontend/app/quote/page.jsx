'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';
import { getAttributionData } from '../../lib/attribution';

const COUNTRIES = [
  { value: 'CA', label: 'Canada' },
  { value: 'US', label: 'United States' }
];

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
const STATES = ['AK', 'AZ', 'CA', 'CO', 'FL', 'GA', 'IL', 'MN', 'MT', 'ND', 'NY', 'OH', 'OR', 'PA', 'SD', 'TX', 'WA', 'WI'];

export default function QuotePage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    fromCountry: 'CA',
    fromProvince: '',
    fromState: '',
    fromCity: '',
    toCountry: 'CA',
    toProvince: '',
    toState: '',
    toCity: '',
    moveDate: '',
    bedrooms: 1,
    estimatedWeightKg: 0,
    estimatedVolume: 0,
    comments: ''
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        attribution: getAttributionData(),
        bedrooms: Number(form.bedrooms),
        estimatedWeightKg: Number(form.estimatedWeightKg) || 0,
        estimatedVolume: Number(form.estimatedVolume) || 0,
        moveDate: form.moveDate ? new Date(form.moveDate).toISOString() : ''
      };
      const response = await apiFetch('/quotes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setResult(response);
    } catch (err) {
      setError(err.message);
    }
  }

  function addRecommendedToCart(productId) {
    window.location.href = `/catalog?add=${productId}`;
  }

  const fromUsesProvince = form.fromCountry === 'CA';
  const toUsesProvince = form.toCountry === 'CA';

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="quote-grid">
        <div className="card">
          <span className="badge">Move quote</span>
          <h1 className="page-title" style={{ fontSize: '2.3rem' }}>Get a quote and product recommendations.</h1>
          <p className="lead">
            Capture a moving lead, store AI-ready quote fields, and automatically generate a pending load for your marketplace foundation.
          </p>
          <div className="card banner-strip" style={{ marginTop: 20, minHeight: 160 }}>
            <div>
              <span className="badge badge-gold">Smart upsells</span>
              <h3 style={{ margin: '10px 0 8px' }}>Comments are parsed for recommended supplies and move kits.</h3>
            </div>
          </div>
        </div>

        <form className="card" onSubmit={submit}>
          <div className="grid grid-2">
            <div className="field"><label>Full Name</label><input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required /></div>
            <div className="field"><label>Email</label><input value={form.email} onChange={(e) => update('email', e.target.value)} required /></div>
            <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => update('phone', e.target.value)} required /></div>
            <div className="field"><label>Move Date</label><input type="datetime-local" value={form.moveDate} onChange={(e) => update('moveDate', e.target.value)} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>Street Address</label><input value={form.address} onChange={(e) => update('address', e.target.value)} /></div>

            <div className="field"><label>From Country</label><select value={form.fromCountry} onChange={(e) => update('fromCountry', e.target.value)}>{COUNTRIES.map((country) => <option key={country.value} value={country.value}>{country.label}</option>)}</select></div>
            <div className="field"><label>From City</label><input value={form.fromCity} onChange={(e) => update('fromCity', e.target.value)} required /></div>
            <div className="field"><label>{fromUsesProvince ? 'From Province' : 'From State'}</label><select value={fromUsesProvince ? form.fromProvince : form.fromState} onChange={(e) => update(fromUsesProvince ? 'fromProvince' : 'fromState', e.target.value)}><option value="">Select</option>{(fromUsesProvince ? PROVINCES : STATES).map((value) => <option key={value} value={value}>{value}</option>)}</select></div>

            <div className="field"><label>To Country</label><select value={form.toCountry} onChange={(e) => update('toCountry', e.target.value)}>{COUNTRIES.map((country) => <option key={country.value} value={country.value}>{country.label}</option>)}</select></div>
            <div className="field"><label>To City</label><input value={form.toCity} onChange={(e) => update('toCity', e.target.value)} required /></div>
            <div className="field"><label>{toUsesProvince ? 'To Province' : 'To State'}</label><select value={toUsesProvince ? form.toProvince : form.toState} onChange={(e) => update(toUsesProvince ? 'toProvince' : 'toState', e.target.value)}><option value="">Select</option>{(toUsesProvince ? PROVINCES : STATES).map((value) => <option key={value} value={value}>{value}</option>)}</select></div>

            <div className="field"><label>Bedrooms</label><input type="number" min="0" value={form.bedrooms} onChange={(e) => update('bedrooms', e.target.value)} /></div>
            <div className="field"><label>Estimated Weight (kg)</label><input type="number" min="0" value={form.estimatedWeightKg} onChange={(e) => update('estimatedWeightKg', e.target.value)} /></div>
            <div className="field"><label>Estimated Volume</label><input type="number" min="0" value={form.estimatedVolume} onChange={(e) => update('estimatedVolume', e.target.value)} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>Comments / Item List</label><textarea value={form.comments} onChange={(e) => update('comments', e.target.value)} placeholder="Example: 2 bedroom move, mattress, couch, dressers, 20 boxes..." /></div>
          </div>

          <div className="action-row" style={{ marginTop: 8 }}>
            <button className="btn" type="submit">Submit Quote</button>
            <Link className="btn secondary" href="/catalog">Shop supplies first</Link>
          </div>

          {error ? <p className="error" style={{ marginTop: 14 }}>{error}</p> : null}
        </form>
      </section>

      {result ? (
        <section className="grid grid-2">
          <div className="card">
            <span className="badge badge-gold">Quote received</span>
            <h2 style={{ marginTop: 12 }}>Load created automatically</h2>
            <p className="muted">
              Quote <strong>{result.quote?.id}</strong> created and pending load <strong>{result.load?.id}</strong> generated for the public feed / future mover marketplace.
            </p>
            <p className="muted">Next step: review your admin dashboard or continue shopping recommended supplies.</p>
            <div className="action-row">
              <Link className="btn" href="/admin/dashboard">Open admin</Link>
              <Link className="btn secondary" href="/loads">View public loads</Link>
            </div>
          </div>

          <div className="card">
            <h2>Recommended supplies</h2>
            {!result.recommendations?.products?.length && !result.recommendations?.kit ? (
              <p className="muted">No upsell recommendations were triggered from the quote comments yet.</p>
            ) : null}

            {result.recommendations?.kit ? (
              <div className="card" style={{ marginBottom: 14 }}>
                <span className="badge badge-gold">Suggested move kit</span>
                <h3 style={{ marginTop: 10 }}>{result.recommendations.kit.name}</h3>
                <p className="muted">{result.recommendations.kit.description}</p>
              </div>
            ) : null}

            <div className="stack-sm">
              {(result.recommendations?.products || []).map((product) => (
                <div key={product.id} className="summary-line">
                  <div>
                    <strong>{product.name}</strong>
                    <div className="muted small">${(product.priceCents / 100).toFixed(2)}</div>
                  </div>
                  <button className="btn secondary" onClick={() => addRecommendedToCart(product.id)}>Add to store cart</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
