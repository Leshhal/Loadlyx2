'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { DataTable, ErrorState, FilterBar, LoadingState, PageHeader, StatusBadge } from '@/components/ui/LoadlyxUI';

export default function ManageMarketplaceProvidersPage() {
  const [providers, setProviders] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [query, setQuery] = useState(''); const [role, setRole] = useState('ALL');
  useEffect(() => { adminFetch('/platform-admin/marketplace-providers').then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load marketplace providers'); setProviders(data); }).catch((err) => setError(err.message)).finally(() => setLoading(false)); }, []);
  const visible = useMemo(() => providers.filter((provider) => (role === 'ALL' || provider.role === role) && `${provider.fullName} ${provider.email} ${provider.tenant?.name || ''} ${provider.carrierProfile?.serviceAreas || ''}`.toLowerCase().includes(query.toLowerCase())), [providers, query, role]);
  const columns = [
    { key: 'provider', label: 'Provider', render: (row) => <div><strong>{row.fullName || row.email}</strong><div className="muted small">{row.email}<br />{row.tenant?.name || 'Independent marketplace account'}</div></div> },
    { key: 'role', label: 'Role', render: (row) => <StatusBadge>{row.role}</StatusBadge> },
    { key: 'rating', label: 'Public reputation', render: (row) => <div><strong>{row.reviewCount ? `${Number(row.rating).toFixed(1)} / 5` : 'Not rated'}</strong><div className="muted small">{row.reviewCount || 0} verified reviews</div></div> },
    { key: 'risk', label: 'Private risk', render: (row) => <div><StatusBadge tone={row.trust?.riskBand === 'LOW_RISK' ? 'success' : row.trust ? 'warning' : 'neutral'}>{row.trust?.riskBand || 'NOT SCORED'}</StatusBadge><div className="muted small">{row.trust ? `Internal score ${row.trust.score}` : 'No internal assessment'}</div></div> },
    { key: 'status', label: 'Account', render: (row) => <StatusBadge tone={row.isActive ? 'success' : 'danger'}>{row.isActive ? 'ACTIVE' : 'SUSPENDED'}</StatusBadge> },
    { key: 'coverage', label: 'Carrier details', render: (row) => row.role === 'CARRIER' ? <div>{row.carrierProfile?.serviceAreas || 'Coverage missing'}<div className="muted small">{row.carrierProfile?.fleetSize ?? 0} vehicles</div></div> : 'Broker account' }
  ];
  return <main className="container grid" style={{ gap: 24 }}><PageHeader eyebrow="Marketplace governance" title="Brokers and carriers" description="Review provider identity, public transaction-backed reputation, internal risk indicators, tenant affiliation, and operating profile." /><FilterBar resultLabel={`${visible.length} of ${providers.length} providers`}><input type="search" aria-label="Search providers" placeholder="Name, email, company, or region" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Provider role" value={role} onChange={(event) => setRole(event.target.value)}><option value="ALL">All providers</option><option value="BROKER">Brokers</option><option value="CARRIER">Carriers</option></select></FilterBar><section className="card">{loading ? <LoadingState label="Loading providers" /> : error ? <ErrorState message={error} /> : <DataTable columns={columns} rows={visible} emptyTitle="No marketplace providers" emptyDescription="Broker and carrier accounts will appear after onboarding." />}</section></main>;
}
