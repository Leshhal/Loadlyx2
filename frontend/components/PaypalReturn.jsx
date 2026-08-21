'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function PaypalReturn({ orderId, tenantSlug }) {
  const [state, setState] = useState({ loading: true, error: '', result: null });
  useEffect(() => {
    if (!orderId) { setState({ loading: false, error: 'Missing PayPal order reference.', result: null }); return; }
    fetch(`${API_URL}/orders/paypal/${encodeURIComponent(orderId)}/capture`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-tenant-slug': tenantSlug } })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'PayPal payment could not be confirmed'); return body; })
      .then((result) => { window.localStorage.removeItem(`loadlyx_cart_${tenantSlug}`); setState({ loading: false, error: '', result }); })
      .catch((error) => setState({ loading: false, error: error.message, result: null }));
  }, [orderId, tenantSlug]);
  return <section className="tenant-checkout-card"><span className="badge">PayPal checkout</span><h1>{state.loading ? 'Confirming your payment…' : state.result ? 'Payment confirmed' : 'Payment needs attention'}</h1>{state.error ? <p className="error">{state.error}</p> : null}{state.result ? <><p className="success">PayPal capture completed.</p><p>Order <strong>{state.result.order?.id}</strong> is now {state.result.order?.paymentStatus}.</p></> : null}<Link className="tenant-store-primary" href="/catalog">Continue shopping</Link></section>;
}