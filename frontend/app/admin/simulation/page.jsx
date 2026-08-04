'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';

async function request(path, options) {
  const response = await adminFetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

export default function SimulationAdminPage() {
  const [config, setConfig] = useState({ scopeKey: 'GLOBAL', enabled: false, intensity: 'LOW', region: 'North America', watermark: 'DEMO DATA' });
  const [events, setEvents] = useState({ total: 0, byKind: {}, events: [] });
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const [configs, eventData] = await Promise.all([request('/simulation/configs'), request('/simulation/events')]);
      setConfig((current) => ({ ...current, ...(configs.find((row) => row.scopeKey === 'GLOBAL') || {}) }));
      setEvents(eventData);
    } catch (error) { setMessage(error.message); }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    const reason = window.prompt('Reason for changing simulated-load visibility:');
    if (!reason) return;
    try {
      const saved = await request('/simulation/configs/GLOBAL', { method: 'PUT', body: JSON.stringify({ enabled: config.enabled, intensity: config.intensity, region: config.region, watermark: config.watermark, businessHours: {}, reason }) });
      setConfig(saved);
      setMessage(saved.enabled ? 'Simulated loads are enabled on the public loadboard. Generate a batch below.' : 'Simulated loads are hidden from the public loadboard. Existing demo events remain isolated.');
    } catch (error) { setMessage(error.message); }
  }

  async function run() {
    try {
      const result = await request('/simulation/run/GLOBAL', { method: 'POST' });
      setMessage(`Created ${result.byKind?.LOAD_POSTED || 0} simulated loads and ${result.total} isolated demo events. No charges, payouts, or notifications were triggered.`);
      await load();
    } catch (error) { setMessage(error.message); }
  }

  async function reset() {
    if (!window.confirm('Delete all simulated events? Real data is unaffected.')) return;
    try { await request('/simulation/events', { method: 'DELETE' }); setMessage('Simulated activity cleared.'); await load(); }
    catch (error) { setMessage(error.message); }
  }

  return <main className="container grid" style={{ gap: 24 }}>
    <section className="card"><h1>Simulated Load Activity</h1><p className="muted">Control the clearly marked demo loads shown on the public Loadlyx Load Board. Simulation never creates real charges, payouts, ratings, orders, or notifications.</p>{message ? <p className="success">{message}</p> : null}</section>
    <section className="card grid grid-2">
      <label className="checkbox-row" style={{ gridColumn: '1 / -1' }}><input type="checkbox" checked={config.enabled} onChange={(event) => setConfig({ ...config, enabled: event.target.checked })} /> Show simulated loads on the public loadboard</label>
      <div className="field"><label>Load activity level</label><select value={config.intensity} onChange={(event) => setConfig({ ...config, intensity: event.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></div>
      <div className="field"><label>Region</label><input value={config.region || ''} onChange={(event) => setConfig({ ...config, region: event.target.value })} /></div>
      <div className="field"><label>Visible demo label</label><input value={config.watermark || 'DEMO DATA'} onChange={(event) => setConfig({ ...config, watermark: event.target.value })} /></div>
      <div className="action-row" style={{ gridColumn: '1 / -1' }}><button className="btn" onClick={save}>Save visibility</button><button className="btn secondary" disabled={!config.enabled} onClick={run}>Generate simulated loads</button><button className="btn ghost" onClick={reset}>Clear simulated activity</button></div>
    </section>
    <section className="card"><div className="row-between"><h2>Current simulation inventory</h2><span className="badge">{config.enabled ? 'VISIBLE' : 'HIDDEN'} · {events.byKind?.LOAD_POSTED || 0} simulated loads</span></div><div className="grid grid-3">{Object.entries(events.byKind || {}).map(([kind, count]) => <div className="card" key={kind}><strong>{kind.replaceAll('_', ' ')}</strong><h2>{count}</h2></div>)}</div></section>
  </main>;
}
