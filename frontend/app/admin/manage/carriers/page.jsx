'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api';

export default function ManageCarriersPage() {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/admin/carriers').then(setCarriers).finally(() => setLoading(false));
  }, []);

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card">
        <h1>Carrier profiles</h1>
        <p className="muted">Phase 1.5 intake for mover onboarding before the lead marketplace is switched on.</p>
      </section>
      <section className="card">
        {loading ? <p className="muted">Loading carriers…</p> : carriers.length === 0 ? <p className="muted">No carrier profiles yet.</p> : (
          <div className="grid" style={{ gap: 16 }}>
            {carriers.map((carrier) => (
              <article key={carrier.id} className="card">
                <div className="badge">{carrier.status}</div>
                <h3>{carrier.companyName}</h3>
                <p className="muted">{carrier.contactName || 'No contact name'} · {carrier.email}</p>
                <p className="muted">Service areas: {carrier.serviceAreas || 'Not provided'}</p>
                <p className="muted">Fleet size: {carrier.fleetSize ?? 'Not provided'} · Equipment: {carrier.equipmentTypes || 'Not provided'}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
