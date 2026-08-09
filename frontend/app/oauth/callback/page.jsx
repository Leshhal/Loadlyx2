'use client';

import { useEffect, useState } from 'react';
import { postLoginPath, refreshSession } from '@/lib/auth';

export default function OAuthCallbackPage() {
  const [error, setError] = useState('');
  useEffect(() => {
    refreshSession().then((data) => window.location.replace(postLoginPath(data.user))).catch((reason) => setError(reason.message || 'OAuth sign-in could not be completed.'));
  }, []);
  return <main className="lx-auth-page"><section className="lx-auth-panel"><div className="lx-auth-card"><h1>Completing secure sign in</h1>{error ? <><p className="lx-form-error">{error}</p><a className="btn" href="/login">Return to login</a></> : <p>Verifying your provider session…</p>}</div></section></main>;
}
