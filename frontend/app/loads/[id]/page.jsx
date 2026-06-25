'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api';

function formatDate(value) {
  if (!value) return 'Flexible';
  return new Date(value).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function PublicLoadDetailPage({ params }) {
  const [load, setLoad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch(`/loads/public/${params.id}`)
      .then(setLoad)
      .catch((err) => setError(err.message || 'Failed to load public load.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card">
        <Link href="/loads" className="text-link">← Back to public load feed</Link>
      </section>
      {loading && <section className="card"><p className="muted">Loading…</p></section>}
      {error && <section className="card"><p className="error">{error}</p></section>}
      {load && (
        <>
          <section className="card">
            <span className="badge">{load.status}</span>
            <h1 className="page-title" style={{ fontSize: '2.3rem', marginTop: 14 }}>{load.title}</h1>
            <p className="lead">{load.route}</p>
            <div className="grid grid-4" style={{ marginTop: 10 }}>
              <div><div className="muted small">Pickup date</div><strong>{formatDate(load.pickupDate)}</strong></div>
              <div><div className="muted small">Estimated weight</div><strong>{load.estimatedWeightKg ? `${load.estimatedWeightKg} kg` : 'TBD'}</strong></div>
              <div><div className="muted small">Equipment</div><strong>{load.equipmentType || 'General moving truck'}</strong></div>
              <div><div className="muted small">Bedrooms</div><strong>{load.bedrooms || 'Not specified'}</strong></div>
            </div>
          </section>

          <section className="grid grid-2">
            <div className="card">
              <h2>Public Summary</h2>
              <p className="muted">{load.summary || 'No additional public notes yet.'}</p>
              <div className="stack-sm">
                <div className="summary-line"><span className="muted">Origin</span><span>{load.originCity}, {load.originProvince || load.originState || load.originCountry}</span></div>
                <div className="summary-line"><span className="muted">Destination</span><span>{load.destinationCity}, {load.destinationProvince || load.destinationState || load.destinationCountry}</span></div>
                <div className="summary-line"><span className="muted">Estimated volume</span><span>{load.estimatedVolume || 'TBD'}</span></div>
              </div>
            </div>

            <div className="card">
              <span className="badge badge-gold">Carrier CTA</span>
              <h2 style={{ marginTop: 12 }}>Claim this lead later</h2>
              <p className="lead" style={{ maxWidth: 'unset' }}>
                Loadlyx is opening its mover lead marketplace in Phase 2. Create your carrier profile now to be notified when lead unlocks and carrier dashboards go live.
              </p>
              <div className="action-row">
                <Link className="btn" href="/carriers/signup">Create carrier profile</Link>
                <Link className="btn secondary" href="/admin/dashboard">Admin dashboard</Link>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
