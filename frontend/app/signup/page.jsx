'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authRequest } from '../../lib/auth';
import { BUSINESS_TYPES, signupPayload } from '../../lib/commerce';
import { COMMERCE_PLANS, commerceSignupSelection, monthlyPrice } from '../../lib/commercePlans';

const roles = [
  ['MARKETPLACE_USER', 'Customer', 'Post your own loads, compare offers, shop, and track.'],
  ['BROKER', 'Broker', 'Manage customer loads, carrier bids, assignments, and margin.'],
  ['CARRIER', 'Carrier', 'Find eligible loads, bid, deliver, and track payouts.'],
  ['TENANT_ADMIN', 'Business owner', 'Create an online store, service business, or logistics workspace.']
];

export default function SignupPage() {
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', passwordConfirmation: '', companyName: '',
    tenantSlug: '', role: 'MARKETPLACE_USER', businessType: 'COMMERCE', planCode: 'STARTER', acceptedTerms: false
  });
  const [result, setResult] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    const selection = commerceSignupSelection(window.location.search);
    setForm((current) => ({ ...current, ...selection }));
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    setResult('');
    if (form.password !== form.passwordConfirmation) {
      setResult('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await authRequest('/auth/signup', signupPayload(form));
      setResult(data.message);
    } catch (error) {
      setResult(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="lx-auth-page lx-signup-page">
    <section className="lx-auth-story">
      <Link className="nav-brand" href="/"><span className="brand-mark">L</span><span className="brand-copy">Loadlyx</span></Link>
      <div><h1>Create your Loadlyx account.</h1><p>Choose a business workspace or join the logistics marketplace.</p></div>
      <small>Already registered? <Link href="/login">Sign in</Link></small>
    </section>
    <section className="lx-auth-panel"><div className="lx-auth-card lx-auth-card-wide">
      <h2>Create account</h2>
      <form onSubmit={submit} className="lx-form">
        <fieldset className="lx-role-picker"><legend>How will you use Loadlyx?</legend>
          {roles.map(([value, label, description]) => <label className={form.role === value ? 'selected' : ''} key={value}>
            <input type="radio" name="role" value={value} checked={form.role === value} onChange={(event) => update('role', event.target.value)} />
            <span><strong>{label}</strong><small>{description}</small></span>
          </label>)}
        </fieldset>
        {form.role === 'TENANT_ADMIN' ? <label>Business type
          <select value={form.businessType} onChange={(event) => update('businessType', event.target.value)}>
            {BUSINESS_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label> : null}
        {form.role === 'TENANT_ADMIN' && form.businessType === 'COMMERCE' ? <label>Commerce plan
          <select value={form.planCode} onChange={(event) => update('planCode', event.target.value)}>
            {COMMERCE_PLANS.map((plan) => <option value={plan.code} key={plan.code}>{plan.name} — {monthlyPrice(plan.monthlyPriceCents)} CAD/month</option>)}
          </select>
          <small>After verifying your email, open Subscription &amp; billing to enroll with a card for 30 days free, then monthly billing until cancelled. Trial enrollment opens after onboarding readiness is verified.</small>
        </label> : null}
        <div className="lx-form-grid">
          <label>Full name<input required autoComplete="name" value={form.fullName} onChange={(event) => update('fullName', event.target.value)} /></label>
          <label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
          <label>Password<input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} /></label>
          <label>Confirm password<input required minLength={8} type="password" autoComplete="new-password" value={form.passwordConfirmation} onChange={(event) => update('passwordConfirmation', event.target.value)} /></label>
          {form.role === 'TENANT_ADMIN' ? <>
            <label>Business name<input required value={form.companyName} onChange={(event) => update('companyName', event.target.value)} /></label>
            <label>Store address<input required value={form.tenantSlug} onChange={(event) => update('tenantSlug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="your-business" /><small>{form.tenantSlug || 'your-business'}.loadlyx.com</small></label>
          </> : null}
        </div>
        <label className="checkbox-row"><input required type="checkbox" checked={form.acceptedTerms} onChange={(event) => update('acceptedTerms', event.target.checked)} /> I agree to the <Link href="/legal/terms">terms</Link> and <Link href="/legal/privacy">privacy policy</Link>.</label>
        {result ? <p className="lx-form-message" role="status">{result}</p> : null}
        <button className="btn lx-btn-lg" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</button>
      </form>
    </div></section>
  </main>;
}
