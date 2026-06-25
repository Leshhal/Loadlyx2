'use client';

import { useState } from 'react';
import { apiFetch } from '../../../lib/api';

export default function CarrierSignupPage() {
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    serviceAreas: '',
    fleetSize: '',
    equipmentTypes: '',
    notes: ''
  });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        ...form,
        fleetSize: form.fleetSize ? Number(form.fleetSize) : undefined
      };
      const res = await apiFetch('/carriers/signup', { method: 'POST', body: JSON.stringify(payload) });
      setMessage(res.message || 'Carrier profile submitted.');
      setForm({ companyName: '', contactName: '', email: '', phone: '', serviceAreas: '', fleetSize: '', equipmentTypes: '', notes: '' });
    } catch (err) {
      setMessage(err.message || 'Failed to submit carrier profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card">
        <span className="badge">Phase 1.5</span>
        <h1>Carrier profile signup</h1>
        <p className="muted">Join the early mover network now. This collects carrier interest and basic profile data while the public load feed is live and the lead marketplace is being prepared for Phase 2.</p>
      </section>
      <section className="card">
        <form className="grid" style={{ gap: 16 }} onSubmit={onSubmit}>
          <div className="grid grid-2">
            <label>Company name<input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required /></label>
            <label>Contact name<input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></label>
          </div>
          <div className="grid grid-2">
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          </div>
          <div className="grid grid-2">
            <label>Service areas<input value={form.serviceAreas} onChange={(e) => setForm({ ...form, serviceAreas: e.target.value })} placeholder="Saskatoon, Regina, Calgary" /></label>
            <label>Fleet size<input type="number" min="0" value={form.fleetSize} onChange={(e) => setForm({ ...form, fleetSize: e.target.value })} /></label>
          </div>
          <label>Equipment types<input value={form.equipmentTypes} onChange={(e) => setForm({ ...form, equipmentTypes: e.target.value })} placeholder="26ft truck, cube van, enclosed trailer" /></label>
          <label>Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} placeholder="Tell us what routes or move types you want access to." /></label>
          <button className="btn" disabled={saving}>{saving ? 'Submitting…' : 'Create carrier profile'}</button>
        </form>
        {message && <p className="muted" style={{ marginTop: 16 }}>{message}</p>}
      </section>
    </main>
  );
}
