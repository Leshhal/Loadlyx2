'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';

function formatDate(value) {
  if (!value) return 'Flexible date';
  return new Date(value).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PublicLoadsPage() {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/loads/public')
      .then(setLoads)
      .catch((err) => setError(err.message || 'Failed to load public loads.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card">
        <div className="load-header">
          <div>
            <span className="badge">Public load feed</span>
            <h1 className="page-title" style={{ fontSize: '2.5rem', marginTop: 10 }}>Loadlyx Load Board</h1>
            <p className="lead">North America freight-style moving lead listings built for SEO, carrier interest, and Phase 2 marketplace growth.</p>
          </div>
          <Link className="btn secondary" href="/carriers/signup">Create carrier profile</Link>
        </div>
      </section>

      <section className="card">
        <div className="filter-bar">
          <input className="form-control" placeholder="Origin" />
          <input className="form-control" placeholder="Destination" />
          <select className="form-control"><option>Equipment</option><option>26ft Truck</option><option>Cube Van</option></select>
          <select className="form-control"><option>Weight</option><option>&lt; 3,000 kg</option><option>3,000–6,000 kg</option><option>6,000+ kg</option></select>
          <input className="form-control" type="date" />
        </div>
      </section>

      {loading && <section className="card"><p className="muted">Loading public loads…</p></section>}
      {error && <section className="card"><p className="error">{error}</p></section>}

      {!loading && !error && (
        <section className="load-feed">
          {loads.length === 0 ? (
            <div className="card"><p className="muted">No public loads yet.</p></div>
          ) : loads.map((load, index) => (
            <article key={load.id} className={`card load-card ${index === 2 ? 'sponsored' : ''}`}>
              <div className="load-icon">{index === 2 ? '🚛' : '📦'}</div>
              <div>
                {index === 2 ? <span className="badge badge-gold">Sponsored load</span> : <span className="badge">{load.status}</span>}
                <h3 style={{ margin: '10px 0 6px' }}>{load.originCity}, {load.originProvince || load.originState || load.originCountry} to {load.destinationCity}, {load.destinationProvince || load.destinationState || load.destinationCountry}</h3>
                <div className="load-meta">
                  <span>{load.equipmentType || 'General moving truck'}</span>
                  <span>{load.estimatedWeightKg ? `${load.estimatedWeightKg} kg` : 'TBD weight'}</span>
                  <span>Pickup: {formatDate(load.pickupDate)}</span>
                </div>
                <p className="muted" style={{ marginTop: 12 }}>{load.summary || 'Detailed inventory will be released later through the mover marketplace.'}</p>
              </div>
              <div style={{ minWidth: 170, textAlign: 'right' }}>
                <div className="load-price">${(1200 + index * 550).toLocaleString()}</div>
                <div className="action-row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                  <Link className="btn secondary" href={`/loads/${load.id}`}>View Details</Link>
                  <Link className="btn" href="/carriers/signup">Contact Broker</Link>
                </div>
              </div>
            </article>
          ))}

          <section className="card load-banner">
            <div>
              <span className="badge badge-gold">Truck insurance</span>
              <h3 style={{ margin: '10px 0 8px' }}>Get a quote today</h3>
              <p className="lead" style={{ margin: 0 }}>Carrier lead capture foundation is live now. Marketplace unlocks next.</p>
            </div>
          </section>
        </section>
      )}
    </main>
  );
}
