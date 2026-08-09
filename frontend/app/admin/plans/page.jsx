'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';
import { ErrorState, LoadingState, PageHeader, StatusBadge } from '../../../components/ui/LoadlyxUI';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const featureFields = [
  ['crm','CRM'],['quotes','Quotes'],['dispatch','Dispatch'],['marketplace','Marketplace'],['brokerTools','Broker tools'],['carrierTools','Carrier tools'],['storefront','Store'],['products','Catalog'],['orders','Orders'],['payments','Payments'],['analytics','Analytics'],['ai','AI tools'],['automation','Automation'],['maps','Maps'],['customBranding','Custom branding'],['customDomains','Custom domains'],['apiAccess','API access'],['prioritySupport','Priority support']
];
const limitFields = [['staffSeats','Users / staff'],['customers','Customers'],['quotesLimit','Quotes'],['loads','Loads'],['productsLimit','Products'],['stores','Stores'],['storageGb','Storage (GB)'],['aiUsage','AI requests'],['automationRuns','Automation runs']];
const defaults = { storefront: true, products: true, quotes: true, crm: true, dispatch: false, marketplace: false, staffSeats: 2 };

export default function PlanEntitlementsPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}/finance/plans`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load plans');
      setPlans(data.plans.map((plan, index) => ({
        ...plan,
        annualPriceCents: plan.annualPriceCents ?? plan.monthlyPriceCents * 10,
        storeCommissionBps: plan.storeCommissionBps ?? plan.commissionBps ?? 650,
        marketplaceCommissionBps: plan.marketplaceCommissionBps ?? plan.commissionBps ?? 650,
        featuresText: (plan.features || plan.featuresJson || []).join('\n'),
        entitlements: { ...defaults, ...(plan.entitlements || plan.entitlementsJson || {}) },
        displayOrder: plan.displayOrder ?? index
      })));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function change(code, field, value) { setPlans((rows) => rows.map((row) => row.code === code ? { ...row, [field]: value } : row)); }
  function entitlement(code, key, value) { setPlans((rows) => rows.map((row) => row.code === code ? { ...row, entitlements: { ...row.entitlements, [key]: value } } : row)); }

  async function save(plan) {
    const reason = window.prompt(`Reason for changing ${plan.name}:`);
    if (!reason) return;
    if (!window.confirm(`Save audited changes to ${plan.name}? Existing subscribers ${plan.grandfatherExisting !== false ? 'will' : 'will not'} be grandfathered.`)) return;
    try {
      const response = await adminFetch(`/finance/admin/plans/${plan.code}`, { method: 'PUT', body: JSON.stringify({
        name: plan.name,
        monthlyPriceCents: Number(plan.monthlyPriceCents),
        annualPriceCents: Number(plan.annualPriceCents),
        storeCommissionBps: Number(plan.storeCommissionBps),
        marketplaceCommissionBps: Number(plan.marketplaceCommissionBps),
        features: plan.featuresText.split('\n').map((value) => value.trim()).filter(Boolean),
        entitlements: plan.entitlements,
        displayOrder: Number(plan.displayOrder),
        effectiveAt: plan.effectiveAt,
        isActive: plan.isActive !== false,
        grandfatherExisting: plan.grandfatherExisting !== false,
        reason
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save plan');
      setMessage(`${plan.name} saved with audited entitlement and commission settings.`);
      await load();
    } catch (err) { setError(err.message); }
  }

  if (loading) return <LoadingState label="Loading plans and entitlements" />;
  return <main className="container grid" style={{ gap: 24 }}>
    <PageHeader eyebrow="Platform billing" title="Plan and tier editor" description="Configure pricing, limits, commissions, and understandable feature switches. Settled transactions retain the rate snapshot used at purchase." />
    {error ? <ErrorState message={error} /> : null}{message ? <p className="success">{message}</p> : null}
    <div className="grid">{plans.map((plan) => <article className="card" key={plan.code}>
      <div className="panel-header"><div><StatusBadge tone={plan.isActive === false ? 'neutral' : 'success'}>{plan.code}</StatusBadge><h2>{plan.name}</h2></div><label className="checkbox-row"><input type="checkbox" checked={plan.isActive !== false} onChange={(event) => change(plan.code, 'isActive', event.target.checked)} /> Public and active</label></div>
      <div className="grid grid-3">
        <label>Plan name<input value={plan.name} onChange={(event) => change(plan.code, 'name', event.target.value)} /></label>
        <label>Monthly price (cents)<input type="number" min="0" value={plan.monthlyPriceCents} onChange={(event) => change(plan.code, 'monthlyPriceCents', event.target.value)} /></label>
        <label>Annual price (cents)<input type="number" min="0" value={plan.annualPriceCents} onChange={(event) => change(plan.code, 'annualPriceCents', event.target.value)} /></label>
        <label>Store commission (%)<input type="number" min="0" max="100" step="0.01" value={Number(plan.storeCommissionBps) / 100} onChange={(event) => change(plan.code, 'storeCommissionBps', Math.round(Number(event.target.value) * 100))} /></label>
        <label>Marketplace commission (%)<input type="number" min="0" max="100" step="0.01" value={Number(plan.marketplaceCommissionBps) / 100} onChange={(event) => change(plan.code, 'marketplaceCommissionBps', Math.round(Number(event.target.value) * 100))} /></label>
        <label>Effective date<input type="datetime-local" value={plan.effectiveAt ? new Date(plan.effectiveAt).toISOString().slice(0, 16) : ''} onChange={(event) => change(plan.code, 'effectiveAt', event.target.value)} /></label>
      </div>
      <h3>Feature entitlements</h3><div className="grid grid-3">{featureFields.map(([key, label]) => <label className="card checkbox-row" key={key}><input type="checkbox" checked={Boolean(plan.entitlements[key])} onChange={(event) => entitlement(plan.code, key, event.target.checked)} /><strong>{label}</strong></label>)}</div>
      <h3>Usage limits</h3><div className="grid grid-3">{limitFields.map(([key, label]) => <label key={key}>{label}<input type="number" min="0" value={Number(plan.entitlements[key] ?? 0)} onChange={(event) => entitlement(plan.code, key, Number(event.target.value))} /></label>)}</div>
      <label>Public feature list<textarea rows="5" value={plan.featuresText} onChange={(event) => change(plan.code, 'featuresText', event.target.value)} /></label>
      <div className="row-between"><label className="checkbox-row"><input type="checkbox" checked={plan.grandfatherExisting !== false} onChange={(event) => change(plan.code, 'grandfatherExisting', event.target.checked)} /> Grandfather current subscribers</label><button className="btn" onClick={() => save(plan)}>Review and save plan</button></div>
    </article>)}</div>
  </main>;
}
