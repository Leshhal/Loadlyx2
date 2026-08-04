'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authRequest } from '../../lib/auth';

function ResetPasswordInner() {
  const params = useSearchParams();
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault(); setResult(''); setError('');
    if (password !== confirmation) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try { const data = await authRequest('/auth/reset-password', { token, password }); setResult(data.message); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return <main className="lx-auth-page"><section className="lx-auth-story"><Link className="nav-brand" href="/"><span className="brand-mark">L</span><span className="brand-copy">Loadlyx</span></Link><div><span className="lx-eyebrow">Protected recovery</span><h1>Choose a new password and secure every session.</h1><p>A completed reset invalidates existing refresh sessions so access starts cleanly.</p><ul><li>Minimum eight characters</li><li>Time-limited reset token</li><li>Session safety built in</li></ul></div><small>Need another link? <Link href="/forgot-password">Request one</Link></small></section><section className="lx-auth-panel"><div className="lx-auth-card"><div><span className="lx-eyebrow">New credentials</span><h2>Reset your password</h2><p>Use the token from your reset link and choose a new password.</p></div><form onSubmit={submit} className="lx-form"><label>Reset token<input required value={token} onChange={event => setToken(event.target.value)} placeholder="Paste your secure token" /></label><label>New password<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" /></label><label>Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>{error ? <p className="lx-form-error" role="alert">{error}</p> : null}{result ? <p className="lx-form-message" role="status">{result}</p> : null}<button className="btn lx-btn-lg" disabled={loading} type="submit">{loading ? 'Resetting password…' : 'Reset password'}</button></form><p className="lx-auth-switch"><Link href="/login">Return to sign in</Link></p></div></section></main>;
}

export default function ResetPasswordPage() { return <Suspense fallback={<main className="lx-auth-page"><section className="lx-auth-panel"><div className="lx-auth-card">Loading secure reset…</div></section></main>}><ResetPasswordInner /></Suspense>; }
