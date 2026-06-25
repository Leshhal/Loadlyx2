'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function OrderDetailPage() {
const { id } = useParams();
const [order, setOrder] = useState(null);
const [error, setError] = useState('');
const [status, setStatus] = useState('');
const [paymentStatus, setPaymentStatus] = useState('');
const [adminNotes, setAdminNotes] = useState('');
const [saving, setSaving] = useState(false);

useEffect(() => {
if (!id) return;

apiFetch(`/orders/${id}`)
.then((data) => {
setOrder(data);
setStatus(data.status || 'PENDING');
setPaymentStatus(data.paymentStatus || 'UNPAID');
setAdminNotes(data.adminNotes || '');
})
.catch((err) => setError(err.message));
}, [id]);

async function saveChanges() {
setSaving(true);

try {
const updated = await apiFetch(`/orders/${id}`, {
method: 'PUT',
body: JSON.stringify({
status,
paymentStatus,
adminNotes
})
});

setOrder(updated);
alert('Order updated');
} catch (err) {
alert(err.message);
} finally {
setSaving(false);
}
}



if (error) return <p className="error">{error}</p>;
if (!order) return <p>Loading...</p>;

return (
<main className="container">
<h1>Order Details</h1>

<p><strong>Customer:</strong> {order.customerName || order.customerEmail}</p>
<p><strong>Status:</strong> {order.status}</p>
<p><strong>Total:</strong> ${(order.totalCents / 100).toFixed(2)}</p>

<h2>Items</h2>
<ul>
   <section className="card" style={{ marginTop: 24, padding: 24 }}>
<h2>Admin Controls</h2>

<div style={{ display: 'grid', gap: 12, maxWidth: 500 }}>
<label>Status</label>
<select value={status} onChange={(e) => setStatus(e.target.value)}>
<option value="PENDING">PENDING</option>
<option value="PAID">PAID</option>
<option value="FULFILLED">FULFILLED</option>
<option value="CANCELLED">CANCELLED</option>
</select>

<label>Payment Status</label>
<select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
<option value="UNPAID">UNPAID</option>
<option value="PAID">PAID</option>
</select>

<label>Admin Notes</label>
<textarea
rows={4}
value={adminNotes}
onChange={(e) => setAdminNotes(e.target.value)}
/>

<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
<button className="btn" onClick={saveChanges} disabled={saving}>
{saving ? 'Saving...' : 'Save Changes'}
</button>

<button
className="btn secondary"
onClick={() => {
setStatus('PAID');
setPaymentStatus('PAID');
}}
>
Mark Paid
</button>

<button
className="btn secondary"
onClick={() => setStatus('FULFILLED')}
>
Mark Fulfilled
</button>
</div>
</div>
</section>
 
{order.items.map((item) => (
<li key={item.id}>
{item.productName} × {item.quantity}
</li>
))}
</ul>
</main>
);
}