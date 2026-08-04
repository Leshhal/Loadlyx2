'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api';
import { DataTable, ErrorState, FilterBar, LoadingState, PageHeader, StatusBadge } from '@/components/ui/LoadlyxUI';

export default function ManageCarriersPage() {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    apiFetch('/admin/carriers').then(setCarriers).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const visible = carriers.filter((carrier) => `${carrier.companyName} ${carrier.contactName} ${carrier.email} ${carrier.serviceAreas}`.toLowerCase().includes(query.toLowerCase()));
  const columns = [
    { key: 'company', label: 'Carrier', render: (carrier) => <><strong>{carrier.companyName}</strong><div className="muted small">{carrier.contactName || 'No contact name'} · {carrier.email}</div></> },
    { key: 'coverage', label: 'Coverage', render: (carrier) => carrier.serviceAreas || 'Not provided' },
    { key: 'capacity', label: 'Capacity', render: (carrier) => <>{carrier.fleetSize ?? '—'} vehicles<div className="muted small">{carrier.equipmentTypes || 'Equipment not provided'}</div></> },
    { key: 'status', label: 'Status', render: (carrier) => <StatusBadge tone={carrier.status === 'APPROVED' ? 'success' : 'warning'}>{carrier.status}</StatusBadge> }
  ];

  return <main className="container grid" style={{ gap: 24 }}>
    <PageHeader eyebrow="Network operations" title="Carrier profiles" description="Review carrier capacity, coverage and onboarding status from one operational view." />
    <FilterBar resultLabel={`${visible.length} of ${carriers.length} carriers`}><label className="field"><span>Search carriers</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Company, contact or region" /></label></FilterBar>
    <section className="card">{loading ? <LoadingState label="Loading carrier network" /> : error ? <ErrorState message={error} /> : <DataTable columns={columns} rows={visible} emptyTitle="No carrier profiles found" emptyDescription="New carrier applications will appear here." />}</section>
  </main>;
}
