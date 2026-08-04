'use client';

import { useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { FormSection, PageHeader, StatusBadge } from '@/components/ui/LoadlyxUI';

const EMPTY_FORM = { companyName: '', contactName: '', email: '', phone: '', serviceAreas: '', fleetSize: '', equipmentTypes: '', notes: '' };

export default function CarrierSignupPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event) {
    event.preventDefault(); setSaving(true); setMessage(''); setIsError(false);
    try {
      const response = await apiFetch('/carriers/signup', { method: 'POST', body: JSON.stringify({ ...form, fleetSize: form.fleetSize ? Number(form.fleetSize) : undefined }) });
      setMessage(response.message || 'Carrier profile submitted.'); setForm(EMPTY_FORM);
    } catch (error) { setIsError(true); setMessage(error.message || 'Failed to submit carrier profile.'); }
    finally { setSaving(false); }
  }

  return <main className="container grid" style={{ gap: 24 }}>
    <PageHeader eyebrow="Carrier network" title="Build your carrier profile" description="Tell Loadlyx where you operate and what capacity you can offer. Your application can then be reviewed for marketplace access." actions={<StatusBadge tone="info">Secure onboarding</StatusBadge>} />
    <form className="grid" style={{ gap: 20 }} onSubmit={onSubmit}>
      <FormSection title="Company contact" description="Use details that the Loadlyx team can verify during onboarding."><div className="grid grid-2"><label className="field"><span>Company name *</span><input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required /></label><label className="field"><span>Contact name</span><input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></label><label className="field"><span>Email *</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label className="field"><span>Phone</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label></div></FormSection>
      <FormSection title="Service capacity" description="This information helps match your operation with relevant loads."><div className="grid grid-2"><label className="field"><span>Service areas</span><input value={form.serviceAreas} onChange={(e) => setForm({ ...form, serviceAreas: e.target.value })} placeholder="Saskatoon, Regina, Calgary" /></label><label className="field"><span>Fleet size</span><input type="number" min="0" value={form.fleetSize} onChange={(e) => setForm({ ...form, fleetSize: e.target.value })} /></label></div><label className="field"><span>Equipment types</span><input value={form.equipmentTypes} onChange={(e) => setForm({ ...form, equipmentTypes: e.target.value })} placeholder="26 ft truck, cube van, enclosed trailer" /></label></FormSection>
      <FormSection title="Additional context" description="Share preferred routes, specialties or other information useful during review." actions={<button className="btn" disabled={saving}>{saving ? 'Submitting…' : 'Submit carrier profile'}</button>}><label className="field"><span>Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} placeholder="Tell us what routes or move types you want access to." /></label>{message ? <p className={isError ? 'error' : 'success'} role="status">{message}</p> : null}</FormSection>
    </form>
  </main>;
}
