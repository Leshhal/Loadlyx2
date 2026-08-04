'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { DataTable, Drawer, ErrorState, FilterBar, LoadingState, PageHeader, StatCard, StatusBadge } from '../../../components/ui/LoadlyxUI';
import { Timeline } from '../../../components/ui/InteractiveUI';

const statusTone = (status) => ['BOOKED','COMPLETED','WON','ACCEPTED'].includes(status) ? 'success' : ['CANCELED','LOST','REJECTED'].includes(status) ? 'danger' : 'warning';
const date = (value) => value ? new Date(value).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not recorded';
const money = (row) => { const cents = row.totalCents ?? row.quotedAmountCents ?? row.estimatedAmountCents ?? row.valueCents; return Number.isFinite(Number(cents)) ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: row.currency || 'CAD', maximumFractionDigits: 0 }).format(Number(cents) / 100) : 'Not priced'; };

export default function CrmPage() {
  const [quotes, setQuotes] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [query, setQuery] = useState(''); const [stage, setStage] = useState('ALL'); const [view, setView] = useState('pipeline'); const [selected, setSelected] = useState(null);
  async function load() { setLoading(true); setError(''); try { setQuotes(await apiFetch('/quotes')); } catch (err) { setError(err.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const stages = [...new Set(quotes.map((row) => row.status).filter(Boolean))];
  const visible = useMemo(() => quotes.filter((row) => (stage === 'ALL' || row.status === stage) && `${row.fullName} ${row.email} ${row.phone} ${row.fromCity} ${row.toCity} ${row.status}`.toLowerCase().includes(query.toLowerCase())), [quotes, query, stage]);
  const booked = quotes.filter((row) => ['BOOKED','COMPLETED','WON','ACCEPTED'].includes(row.status)).length;
  const attention = quotes.filter((row) => !['BOOKED','COMPLETED','CANCELED','LOST','REJECTED'].includes(row.status)).length;
  const conversion = quotes.length ? Math.round((booked / quotes.length) * 100) : 0;
  const columns = [
    { key: 'customer', label: 'Customer', render: (row) => <button type="button" className="lx-text-button" onClick={() => setSelected(row)}><strong>{row.fullName || 'Unnamed customer'}</strong><span>{row.email || row.phone || 'No contact recorded'}</span></button> },
    { key: 'route', label: 'Opportunity', render: (row) => <>{row.fromCity || 'Origin TBD'} → {row.toCity || 'Destination TBD'}<div className="muted small">{row.bedrooms != null ? `${row.bedrooms} bedroom move` : 'Move size not recorded'}</div></> },
    { key: 'value', label: 'Value', render: money },
    { key: 'status', label: 'Pipeline stage', render: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status || 'NEW'}</StatusBadge> },
    { key: 'date', label: 'Move date', render: (row) => date(row.moveDate) },
    { key: 'next', label: 'Next action', render: (row) => <strong className="lx-next-action">{['BOOKED','COMPLETED'].includes(row.status) ? 'Operational handoff' : row.status === 'CANCELED' ? 'Closed' : 'Review and follow up'}</strong> }
  ];
  const groups = stages.length ? stages : ['NEW'];
  const history = selected ? [
    selected.createdAt ? { title: 'Opportunity captured', description: 'Quote request entered the CRM pipeline.', time: date(selected.createdAt), icon: 'users' } : null,
    { title: `Current stage: ${selected.status || 'NEW'}`, description: ['BOOKED','COMPLETED'].includes(selected.status) ? 'This opportunity has moved into operations.' : 'This is the latest status available from the quote record.', time: selected.updatedAt ? date(selected.updatedAt) : undefined, icon: 'chart' },
    selected.moveDate ? { title: 'Move date', description: `${selected.fromCity || 'Origin'} to ${selected.toCity || 'destination'}`, time: date(selected.moveDate), icon: 'route' } : null
  ].filter(Boolean) : [];

  return <main className="container"><PageHeader eyebrow="Sales outcomes" title="CRM and quote pipeline" description="Prioritize the customer opportunities that need attention, understand route and value, and move accepted work into operations." actions={<div className="action-row"><button className={`btn ghost ${view === 'pipeline' ? 'active' : ''}`} onClick={() => setView('pipeline')}>Pipeline</button><button className={`btn ghost ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>Table</button></div>} />
    {error ? <ErrorState message={error} onRetry={load} /> : loading ? <LoadingState label="Loading CRM pipeline" /> : <>
      <section className="lx-stat-grid"><StatCard label="Open opportunities" value={quotes.length - booked} detail="Quotes not yet converted" icon="users" /><StatCard label="Converted" value={booked} detail={`${conversion}% of captured quotes`} tone="green" icon="check" /><StatCard label="Needs attention" value={attention} detail="Follow-up queue" tone="orange" icon="alert" /><StatCard label="Known customers" value={new Set(quotes.map((row) => row.email).filter(Boolean)).size} detail="Unique quote contacts" tone="purple" icon="users" /></section>
      <section className="lx-panel" style={{ marginTop: 20 }}><FilterBar resultLabel={`${visible.length} opportunities`}><label className="field"><span>Search</span><input type="search" placeholder="Customer, route or contact" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className="field"><span>Pipeline stage</span><select value={stage} onChange={(event) => setStage(event.target.value)}><option value="ALL">All stages</option>{stages.map((value) => <option key={value}>{value}</option>)}</select></label></FilterBar>
        {view === 'table' ? <DataTable columns={columns} rows={visible} emptyTitle="No CRM opportunities" emptyDescription="Customer quote requests will create the first pipeline records." /> : <div className="lx-crm-board">{groups.map((group) => { const rows = visible.filter((row) => (row.status || 'NEW') === group); return <section key={group}><header><StatusBadge tone={statusTone(group)}>{group}</StatusBadge><span>{rows.length}</span></header><div>{rows.map((row) => <button type="button" className="lx-crm-card" key={row.id} onClick={() => setSelected(row)}><strong>{row.fullName || 'Unnamed customer'}</strong><span>{row.fromCity || 'Origin TBD'} → {row.toCity || 'Destination TBD'}</span><div><b>{money(row)}</b><small>{date(row.moveDate)}</small></div></button>)}{!rows.length ? <p>No opportunities</p> : null}</div></section>; })}</div>}
      </section>
    </>}
    <Drawer open={Boolean(selected)} title={selected?.fullName || 'Customer opportunity'} description={selected ? `${selected.fromCity || 'Origin TBD'} → ${selected.toCity || 'Destination TBD'}` : ''} onClose={() => setSelected(null)} footer={selected?.email ? <a className="btn" href={`mailto:${selected.email}`}>Email customer</a> : null}>{selected ? <div className="grid" style={{ gap: 22 }}><section className="lx-detail-grid"><div><span>Stage</span><StatusBadge tone={statusTone(selected.status)}>{selected.status || 'NEW'}</StatusBadge></div><div><span>Opportunity value</span><strong>{money(selected)}</strong></div><div><span>Email</span><strong>{selected.email || 'Not recorded'}</strong></div><div><span>Phone</span><strong>{selected.phone || 'Not recorded'}</strong></div><div><span>Deposit</span><strong>{selected.depositStatus || 'Not recorded'}</strong></div><div><span>Move date</span><strong>{date(selected.moveDate)}</strong></div></section><section><h3>Activity timeline</h3><Timeline items={history} /></section>{selected.comments ? <section><h3>Customer notes</h3><p className="muted">{selected.comments}</p></section> : null}</div> : null}</Drawer>
  </main>;
}
