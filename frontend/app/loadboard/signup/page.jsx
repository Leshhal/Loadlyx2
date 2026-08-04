'use client';

import Link from 'next/link';
import { useState } from 'react';
import { authRequest } from '@/lib/auth';

export default function FreightSignupPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', passwordConfirmation: '', acceptedTerms: false });
  const [message, setMessage] = useState('');
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    if (form.password !== form.passwordConfirmation) return setMessage('Passwords do not match.');
    try {
      const { passwordConfirmation, ...input } = form;
      const result = await authRequest('/auth/signup', { ...input, role: 'MARKETPLACE_USER' });
      setMessage(result.message || 'Account created. Check your email to verify it before signing in.');
    } catch (error) { setMessage(error.message); }
  }

  return <main className="lx-auth-page lx-freight-auth"><section className="lx-auth-story"><Link className="nav-brand" href="/loadboard"><span className="brand-mark">F</span><span><strong>Freight Exchange</strong><small>Powered by Loadlyx</small></span></Link><div><span className="lx-eyebrow">Loadboard account</span><h1>Your freight activity, without the business-software clutter.</h1><p>This account is designed for people posting their own loads. Broker and carrier capabilities require their respective onboarding and approval.</p><ul><li>Post your own loads</li><li>Review offers and status</li><li>Keep SaaS tools safely separated</li></ul></div></section><section className="lx-auth-panel"><div className="lx-auth-card"><div><span className="lx-eyebrow">Create account</span><h2>Join Freight Exchange</h2><p>Create a customer loadboard account.</p></div><form className="lx-form" onSubmit={submit}><label>Full name<input required value={form.fullName} onChange={(event) => update('fullName', event.target.value)} /></label><label>Email address<input required type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label><label>Password<input required minLength={8} type="password" value={form.password} onChange={(event) => update('password', event.target.value)} /></label><label>Confirm password<input required minLength={8} type="password" value={form.passwordConfirmation} onChange={(event) => update('passwordConfirmation', event.target.value)} /></label><label className="checkbox-row"><input required type="checkbox" checked={form.acceptedTerms} onChange={(event) => update('acceptedTerms', event.target.checked)} /> I agree to the terms and privacy policy.</label>{message ? <p className="lx-form-message" role="status">{message}</p> : null}<button className="btn lx-btn-lg">Create loadboard account</button></form><p className="lx-auth-switch">Already registered? <Link href="/loadboard/login">Sign in</Link></p></div></section></main>;
}
