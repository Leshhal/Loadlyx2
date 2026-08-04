'use client';

import Link from 'next/link';
import { useState } from 'react';
import { authRequest } from '../../lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setResult(''); setError(''); setLoading(true);
    try {
      const data = await authRequest('/auth/forgot-password', { email });
      setResult(data.message || 'If the account exists, reset instructions have been created.');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return <main className="lx-auth-page"><section className="lx-auth-story"><Link className="nav-brand" href="/"><span className="brand-mark">L</span><span className="brand-copy">Loadlyx</span></Link><div><span className="lx-eyebrow">Account recovery</span><h1>Get securely back to the work that matters.</h1><p>Request a time-limited reset link without exposing whether an account exists.</p><ul><li>Secure reset tokens</li><li>Existing sessions revoked after reset</li><li>Local development link support</li></ul></div><small>Remembered it? <Link href="/login">Return to sign in</Link></small></section><section className="lx-auth-panel"><div className="lx-auth-card"><div><span className="lx-eyebrow">Reset access</span><h2>Forgot your password?</h2><p>Enter the email associated with your Loadlyx account.</p></div><form onSubmit={submit} className="lx-form"><label>Email address<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@company.com" /></label>{error ? <p className="lx-form-error" role="alert">{error}</p> : null}{result ? <p className="lx-form-message" role="status">{result}</p> : null}<button className="btn lx-btn-lg" disabled={loading} type="submit">{loading ? 'Creating reset link…' : 'Create reset link'}</button></form><p className="lx-auth-switch"><Link href="/login">← Back to sign in</Link></p></div></section></main>;
}
