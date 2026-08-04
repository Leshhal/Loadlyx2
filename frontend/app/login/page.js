'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authRequest, storeSession } from '../../lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const providerNames = { google: 'Google', apple: 'Apple', discord: 'Discord' };

function LoginInner() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/auth/oauth/providers`)
      .then((response) => response.ok ? response.json() : { providers: [] })
      .then((data) => setProviders(data.providers || []))
      .catch(() => setProviders([]));
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authRequest('/auth/login', { email, password });
      storeSession(data);
      const platformRoles = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT'];
      const defaultPath = platformRoles.includes(data.user?.role)
        ? '/admin/platform'
        : data.user?.role === 'TENANT_ADMIN'
          ? '/admin/dashboard'
          : '/app/dashboard';
      window.location.assign(searchParams.get('next') || defaultPath);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function startOAuth(provider) {
    if (!provider.available) return;
    window.location.assign(`${API_URL}/auth/oauth/${provider.key}/start`);
  }

  return <main className="lx-auth-page"><section className="lx-auth-story"><Link className="nav-brand" href="/"><span className="brand-mark">L</span><span className="brand-copy">Loadlyx</span></Link><div><span className="lx-eyebrow">Welcome back</span><h1>Pick up exactly where the operation left off.</h1><p>Quotes, jobs, marketplace activity, store performance, and AI recommendations remain connected to your role and tenant.</p><ul><li>Role-aware workspace</li><li>Secure rotating sessions</li><li>Connected operational visibility</li></ul></div><small>One platform for movers, brokers, carriers, and customers.</small></section><section className="lx-auth-panel"><div className="lx-auth-card"><div><span className="lx-eyebrow">Secure access</span><h2>Sign in to Loadlyx</h2><p>Use your account email and password.</p></div><form onSubmit={handleLogin} className="lx-form"><label>Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></label><label>Password<span className="lx-label-row"><Link href="/forgot-password">Forgot password?</Link></span><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>{error ? <p className="lx-form-error" role="alert">{error}</p> : null}<button className="btn lx-btn-lg" disabled={loading} type="submit">{loading ? 'Signing in…' : 'Sign in'}</button></form><div className="lx-divider"><span>other sign-in providers</span></div><div className="lx-oauth-grid">{providers.length ? providers.map((provider) => <button key={provider.key} className="btn secondary" type="button" disabled={!provider.available} title={provider.available ? `Continue with ${providerNames[provider.key]}` : provider.reason} onClick={() => startOAuth(provider)}>{providerNames[provider.key]}{provider.available ? '' : ' — unavailable'}</button>) : <p className="muted">External sign-in providers are unavailable in this environment.</p>}</div><p className="lx-auth-switch">New to Loadlyx? <Link href="/signup">Create an account</Link></p></div></section></main>;
}

export default function LoginPage() {
  return <Suspense fallback={<main className="lx-auth-page"><section className="lx-auth-panel"><div className="lx-auth-card">Loading secure sign in…</div></section></main>}><LoginInner /></Suspense>;
}
