'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

function money(cents = 0) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format((cents || 0) / 100);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/orders').then(setOrders).catch((err) => setError(err.message));
  }, []);

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card">
        <h1>Orders</h1>
        <p className="muted">Review store orders, totals, and attribution captured at checkout.</p>
        {error ? <p className="error">{error}</p> : null}
      </section>
      <section className="card">
        <table className="table">
          <thead><tr><th>Customer</th><th>Status</th><th>Total</th><th>Source</th><th>Created</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr
key={order.id}
onClick={() => window.location.href = `/admin/manage/orders/${order.id}`}
style={{ cursor: 'pointer' }}
>
                <td>{order.customerName || order.customerEmail}</td>
                <td>{order.status}</td>
                <td>{money(order.totalCents)}</td>
                <td>{order.attributionUtmSource || 'direct/unknown'}</td>
                <td>{new Date(order.createdAt).toLocaleDateString('en-CA')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
