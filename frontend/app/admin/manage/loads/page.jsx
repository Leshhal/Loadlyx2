'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api';

const STATUS_OPTIONS = ['PENDING', 'POSTED', 'BOOKED', 'COMPLETED', 'CANCELED'];

export default function LoadsPage() {
  const [loads, setLoads] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState('');

  async function refresh() {
    const rows = await apiFetch('/loads');
    setLoads(rows.map((load) => ({ ...load, draftStatus: load.status, draftNotes: load.summary || '' })));
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, []);

  async function saveLoad(load) {
    setSavingId(load.id);
    setMessage('');
    try {
      await apiFetch(`/loads/${load.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: load.draftStatus,
          notes: load.draftNotes
        })
      });
      setMessage('Load updated');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId('');
    }
  }

  async function deleteLoad(load) {
    if (!window.confirm(`Delete load from ${load.originCity} to ${load.destinationCity}?`)) return;
    setSavingId(load.id);
    setMessage('');
    try {
      await apiFetch(`/loads/${load.id}`, { method: 'DELETE' });
      setMessage('Load deleted');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId('');
    }
  }

  function updateDraft(id, patch) {
    setLoads((current) => current.map((load) => (load.id === id ? { ...load, ...patch } : load)));
  }

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card">
        <h1>Loads</h1>
        <p className="muted">Owner tenants and platform admins can edit or delete their loads here.</p>
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>
      <section className="card">
        <table className="table">
          <thead><tr><th>Status</th><th>Origin</th><th>Destination</th><th>Weight</th><th>Pickup</th><th>Notes</th><th>Action</th></tr></thead>
          <tbody>
            {loads.map((load) => (
              <tr key={load.id}>
                <td>
                  <select value={load.draftStatus} onChange={(e) => updateDraft(load.id, { draftStatus: e.target.value })}>
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </td>
                <td>{load.originCity}</td>
                <td>{load.destinationCity}</td>
                <td>{load.estimatedWeightKg ? Number(load.estimatedWeightKg).toFixed(2) : '-'}</td>
                <td>{load.pickupDate ? new Date(load.pickupDate).toLocaleDateString('en-CA') : '-'}</td>
                <td><textarea value={load.draftNotes} onChange={(e) => updateDraft(load.id, { draftNotes: e.target.value })} rows={2} style={{ minWidth: 220 }} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn secondary" disabled={savingId === load.id} onClick={() => saveLoad(load)}>{savingId === load.id ? 'Saving...' : 'Save'}</button>
                    <button className="btn ghost" disabled={savingId === load.id} onClick={() => deleteLoad(load)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
