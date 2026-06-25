'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    if (!sessionId) {
      setState({ loading: false, error: 'Missing Stripe session ID.', data: null });
      return;
    }

    apiFetch(`/orders/session/${sessionId}`)
      .then((data) => setState({ loading: false, error: '', data }))
      .catch((error) => setState({ loading: false, error: error.message, data: null }));
  }, [sessionId]);

  return (
    <main className="container">
      <div className="card">
        <h1>Checkout success</h1>
        {state.loading ? <p className="muted">Confirming your Stripe payment…</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}
        {state.data ? (
          <>
            <p className="success">
              Payment status: <strong>{state.data.session.paymentStatus}</strong>
            </p>
            <p className="muted">
              Order email: {state.data.session.customerEmail || state.data.order?.customerEmail || 'n/a'}
            </p>
            {state.data.order ? (
              <div style={{ marginTop: 16 }}>
                <p><strong>Order total:</strong> ${(state.data.order.totalCents / 100).toFixed(2)}</p>
                <p><strong>Status in Loadlyx:</strong> {state.data.order.status}</p>
                <p><strong>Items:</strong> {state.data.order.items.length}</p>
              </div>
            ) : null}
          </>
        ) : null}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <Link className="btn" href="/catalog">Back to store</Link>
          <Link className="btn secondary" href="/admin/dashboard">Open admin dashboard</Link>
        </div>
      </div>
    </main>
  );
}
