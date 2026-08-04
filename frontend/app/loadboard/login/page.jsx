'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authRequest, storeSession } from '@/lib/auth';

function FreightLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authRequest('/auth/login', { email, password });
      storeSession(data);
      const requested = searchParams.get('next');
      const platformRoles = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT'];
      const destination = requested || (platformRoles.includes(data.user?.role)
        ? '/admin/platform'
        : data.user?.role === 'TENANT_ADMIN'
          ? '/admin/dashboard'
          : '/app/dashboard');
      window.location.assign(destination);
    } catch (loginError) { setError(loginError.message || 'Unable to sign in'); }
    finally { setLoading(false); }
  }

  return <main className="lx-auth-page lx-freight-auth">
    <section className="lx-auth-story"><Link className="nav-brand" href="/loadboard"><span className="brand-mark">F</span><span><strong>Freight Exchange</strong><small>Powered by Loadlyx</small></span></Link><div><span className="lx-eyebrow">Marketplace access</span><h1>Post, compare, and move freight with confidence.</h1><p>Sign in to view commercial details, post your own load, manage offers, and follow every active movement.</p><ul><li>Private pricing visibility</li><li>Protected load posting</li><li>Role-based offers and activity</li></ul></div><small>Freight Exchange accounts are separate from SaaS tenant workspaces.</small></section>
    <section className="lx-auth-panel"><div className="lx-auth-card"><div><span className="lx-eyebrow">Freight Exchange</span><h2>Sign in</h2><p>Access your loadboard account.</p></div><form className="lx-form" onSubmit={submit}><label>Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error ? <p className="lx-form-error" role="alert">{error}</p> : null}<button className="btn lx-btn-lg" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button></form><p className="lx-auth-switch">Need a loadboard account? <Link href="/loadboard/signup">Create one</Link></p></div></section>
  </main>;
}

export default function FreightLoginPage() {
  return <Suspense fallback={<main className="lx-auth-page"><section className="lx-auth-panel"><div className="lx-auth-card">Loading sign in…</div></section></main>}><FreightLoginForm /></Suspense>;
}
