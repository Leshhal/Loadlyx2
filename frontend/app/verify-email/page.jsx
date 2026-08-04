'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authRequest } from '../../lib/auth';

function VerifyEmailInner() {
  const params = useSearchParams();
  const [token, setToken] = useState(params.get('token') || '');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState('');

  async function verify(event) { event.preventDefault(); setResult(''); setError(''); setLoading('verify'); try { const data = await authRequest('/auth/verify-email', { token }); setResult(data.message); } catch (err) { setError(err.message); } finally { setLoading(''); } }
  async function resend(event) { event.preventDefault(); setResult(''); setError(''); setLoading('resend'); try { const data = await authRequest('/auth/resend-verification', { email }); setResult(data.message); } catch (err) { setError(err.message); } finally { setLoading(''); } }

  return <main className="lx-auth-page"><section className="lx-auth-story"><Link className="nav-brand" href="/"><span className="brand-mark">L</span><span className="brand-copy">Loadlyx</span></Link><div><span className="lx-eyebrow">Verify identity</span><h1>Confirm your email before entering protected workflows.</h1><p>Verification keeps marketplace, tenant, and platform access tied to a valid account.</p><ul><li>Role-aware access</li><li>Secure verification token</li><li>Resend support</li></ul></div><small>Already verified? <Link href="/login">Sign in</Link></small></section><section className="lx-auth-panel"><div className="lx-auth-card"><div><span className="lx-eyebrow">Email confirmation</span><h2>Verify your email</h2><p>Open the verification link or paste its token below.</p></div><form onSubmit={verify} className="lx-form"><label>Verification token<input required value={token} onChange={event => setToken(event.target.value)} placeholder="Paste verification token" /></label><button className="btn lx-btn-lg" disabled={Boolean(loading)} type="submit">{loading === 'verify' ? 'Verifying…' : 'Verify email'}</button></form><div className="lx-divider"><span>need another email?</span></div><form onSubmit={resend} className="lx-form"><label>Email address<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@company.com" /></label><button className="btn secondary" disabled={Boolean(loading)} type="submit">{loading === 'resend' ? 'Sending…' : 'Resend verification'}</button></form>{error ? <p className="lx-form-error" role="alert">{error}</p> : null}{result ? <p className="lx-form-message" role="status">{result}</p> : null}<p className="lx-auth-switch"><Link href="/login">Return to sign in</Link></p></div></section></main>;
}

export default function VerifyEmailPage() { return <Suspense fallback={<main className="lx-auth-page"><section className="lx-auth-panel"><div className="lx-auth-card">Loading verification…</div></section></main>}><VerifyEmailInner /></Suspense>; }
