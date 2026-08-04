'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { PageHeader, LoadingState, ErrorState, StatusBadge } from '@/components/ui/LoadlyxUI';

const money = (value) => `$${((value || 0) / 100).toFixed(2)}`;

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [shippingCarrier, setShippingCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  async function load() { const data = await apiFetch(`/orders/${id}`); setOrder(data); setAdminNotes(data.adminNotes || ''); setShippingCarrier(data.shippingCarrier || ''); setTrackingNumber(data.trackingNumber || ''); }
  useEffect(() => { if (id) load().catch((err) => setError(err.message)); }, [id]);
  async function saveNotes() { setSaving(true); setError(''); try { const updated = await apiFetch(`/orders/${id}`, { method: 'PUT', body: JSON.stringify({ adminNotes }) }); setOrder(updated); setMessage('Order notes saved.'); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  async function fulfillment(action) { setSaving(true); setError(''); setMessage(''); try { const updated = await apiFetch(`/orders/${id}/fulfillment`, { method: 'POST', body: JSON.stringify({ action, shippingCarrier, trackingNumber }) }); setOrder(updated); setMessage(`Order ${action.toLowerCase()} action completed.`); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  async function refund() { const maximum = (order.totalCents - (order.refundedCents || 0)) / 100; const raw = window.prompt(`Refund amount (maximum $${maximum.toFixed(2)})`, maximum.toFixed(2)); if (raw === null) return; const reason = window.prompt('Reason for refund'); if (!reason) return; const manual = !order.stripePaymentIntentId && window.confirm('No processor payment is attached. Record this as a confirmed manual refund?'); setSaving(true); setError(''); try { const result = await apiFetch(`/orders/${id}/refund`, { method: 'POST', body: JSON.stringify({ amountCents: Math.round(Number(raw) * 100), reason, manual }) }); setOrder(result.order); setMessage(result.ledgerRecorded ? 'Refund completed and recorded in the ledger.' : 'Refund recorded. No original settlement ledger entry was available.'); } catch (err) { setError(err.message); } finally { setSaving(false); } }

  if (error && !order) return <main className="container"><ErrorState message={error} /></main>;
  if (!order) return <main className="container"><LoadingState label="Loading order" /></main>;
  return <main className="container"><PageHeader eyebrow="Commerce operations" title={`Order ${order.id.slice(-8).toUpperCase()}`} description="Confirm, fulfil, ship, deliver, refund and audit this order." />{error ? <p className="error" role="alert">{error}</p> : null}{message ? <p className="success" role="status">{message}</p> : null}<section className="grid two" style={{ gap: 20 }}><div className="card"><h2>Customer & payment</h2><p><strong>{order.customerName || 'Customer'}</strong><br />{order.customerEmail}</p><p>Order <StatusBadge value={order.status} /> Payment <StatusBadge value={order.paymentStatus} /></p><p>Fulfilment <StatusBadge value={order.fulfillmentStatus || 'UNCONFIRMED'} /></p><p><strong>Total:</strong> {money(order.totalCents)} · <strong>Refunded:</strong> {money(order.refundedCents)}</p></div><div className="card"><h2>Line items</h2>{order.items.map((item) => <div key={item.id} className="summary-line"><span>{item.productName} × {item.quantity}</span><strong>{money(item.unitPriceCents * item.quantity)}</strong></div>)}</div></section><section className="card" style={{ marginTop: 20 }}><h2>Fulfilment controls</h2><div className="grid two" style={{ gap: 12 }}><label>Shipping carrier<input value={shippingCarrier} onChange={(e) => setShippingCarrier(e.target.value)} placeholder="Canada Post, UPS, tenant delivery" /></label><label>Tracking number<input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Required when marking shipped" /></label></div><div className="action-row" style={{ marginTop: 16 }}><button className="btn secondary" disabled={saving} onClick={() => fulfillment('CONFIRM')}>Confirm order</button><button className="btn secondary" disabled={saving} onClick={() => fulfillment('PROCESS')}>Start fulfilment</button><button className="btn" disabled={saving || !trackingNumber} onClick={() => fulfillment('SHIP')}>Mark shipped</button><button className="btn" disabled={saving} onClick={() => fulfillment('DELIVER')}>Mark delivered</button><button className="btn secondary" disabled={saving || order.paymentStatus === 'REFUNDED'} onClick={refund}>Issue refund</button><button className="btn ghost" disabled={saving} onClick={() => fulfillment('CANCEL')}>Cancel order</button></div></section><section className="card" style={{ marginTop: 20 }}><h2>Internal notes</h2><textarea rows={5} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} /><button className="btn" disabled={saving} onClick={saveNotes} style={{ marginTop: 12 }}>{saving ? 'Saving…' : 'Save notes'}</button></section></main>;
}
