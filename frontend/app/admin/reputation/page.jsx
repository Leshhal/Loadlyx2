'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { DataTable, ErrorState, LoadingState, PageHeader, StatCard, StatusBadge } from '@/components/ui/LoadlyxUI';

async function read(response) { const data = await response.json(); if (!response.ok) throw new Error(data?.error || 'Request failed'); return data; }
const tone = (status) => status === 'PUBLISHED' || status === 'RESOLVED' ? 'success' : status === 'REMOVED' || status === 'REJECTED' ? 'danger' : 'warning';

export default function ReputationAdminPage() {
  const [reviews, setReviews] = useState([]); const [disputes, setDisputes] = useState([]); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function load() { setLoading(true); setError(''); try { const [reviewRows, disputeRows] = await Promise.all([read(await adminFetch('/reviews/admin/all')), read(await adminFetch('/disputes/admin/all'))]); setReviews(reviewRows); setDisputes(disputeRows); } catch (err) { setError(err.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function moderate(review, status) { const reason = window.prompt(`Reason for setting review to ${status}:`); if (!reason) return; try { await read(await adminFetch(`/reviews/admin/${review.id}/moderate`, { method: 'PUT', body: JSON.stringify({ status, reason }) })); setMessage('Review moderation saved and audited.'); await load(); } catch (err) { setError(err.message); } }
  async function resolve(dispute, status) { const resolution = window.prompt(`Resolution notes for ${status}:`); if (!resolution) return; try { await read(await adminFetch(`/disputes/admin/${dispute.id}`, { method: 'PUT', body: JSON.stringify({ status, resolution }) })); setMessage('Dispute status saved and audited.'); await load(); } catch (err) { setError(err.message); } }
  const reviewColumns = [
    { key: 'rating', label: 'Rating', render: (row) => <strong aria-label={`${row.rating} out of 5 stars`}>{'★'.repeat(row.rating)}</strong> },
    { key: 'reviewer', label: 'Reviewer', render: (row) => <>{row.reviewer?.fullName || row.reviewer?.email}<div className="muted small">{row.reviewer?.role}</div></> },
    { key: 'review', label: 'Review', render: (row) => <><strong>{row.title}</strong><div>{row.body}</div>{row.verifiedTransaction ? <StatusBadge tone="success">Verified</StatusBadge> : null}</> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge tone={tone(row.moderationStatus)}>{row.moderationStatus}</StatusBadge> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="action-row"><button className="btn ghost" onClick={() => moderate(row, 'PUBLISHED')}>Publish</button><button className="btn ghost" onClick={() => moderate(row, 'HIDDEN')}>Hide</button><button className="btn secondary" onClick={() => moderate(row, 'REMOVED')}>Remove</button></div> }
  ];
  const disputeColumns = [
    { key: 'openedBy', label: 'Opened by', render: (row) => row.openedByUser?.fullName || row.openedByUser?.email },
    { key: 'reason', label: 'Case', render: (row) => <><strong>{row.reason}</strong><div className="muted small">{row.transactionType} · {row.transactionId}</div></> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge tone={tone(row.status)}>{row.status}</StatusBadge> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="action-row"><button className="btn ghost" onClick={() => resolve(row, 'UNDER_REVIEW')}>Review</button><button className="btn" onClick={() => resolve(row, 'RESOLVED')}>Resolve</button><button className="btn secondary" onClick={() => resolve(row, 'REJECTED')}>Reject</button></div> }
  ];
  return <main className="container grid" style={{ gap: 24 }}>
    <PageHeader eyebrow="Trust and safety" title="Reputation and disputes" description="Moderate verified feedback and transaction disputes. Every action requires a reason and is audited." />
    {message ? <p className="success" role="status">{message}</p> : null}{error ? <ErrorState message={error} onRetry={load} /> : null}
    <section className="lx-stat-grid"><StatCard label="Reviews" value={reviews.length} icon="users" /><StatCard label="Reported" value={reviews.filter((row) => row.reports?.length).length} tone="gold" icon="alert" /><StatCard label="Open disputes" value={disputes.filter((row) => !['RESOLVED','REJECTED'].includes(row.status)).length} tone="violet" icon="route" /></section>
    {loading ? <LoadingState label="Loading reputation records" /> : <><section className="card"><h2>Review moderation</h2><DataTable columns={reviewColumns} rows={reviews} emptyTitle="No reviews awaiting management" emptyDescription="Verified marketplace and store reviews will appear here." /></section><section className="card"><h2>Transaction disputes</h2><DataTable columns={disputeColumns} rows={disputes} emptyTitle="No disputes" emptyDescription="New dispute cases will appear here for review." /></section></>}
  </main>;
}
