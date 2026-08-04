'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { DataTable, ErrorState, LoadingState, PageHeader, StatCard, StatusBadge } from '@/components/ui/LoadlyxUI';

async function request(path, options) { const response = await adminFetch(path, options); const data = response.status === 204 ? null : await response.json(); if (!response.ok) throw new Error(data?.error || 'Request failed'); return data; }

export default function PlatformAdminPage() {
  const [summary, setSummary] = useState({}); const [users, setUsers] = useState([]); const [tenants, setTenants] = useState([]); const [flags, setFlags] = useState([]); const [health, setHealth] = useState({}); const [audit, setAudit] = useState([]); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); setError(''); try { const [summaryData, userRows, tenantRows, flagRows, healthData, auditRows] = await Promise.all(['/platform-admin/summary', '/platform-admin/users', '/platform-admin/tenants', '/platform-admin/feature-flags', '/platform-admin/health', '/platform-admin/audit-events'].map((path) => request(path))); setSummary(summaryData); setUsers(userRows); setTenants(tenantRows); setFlags(flagRows); setHealth(healthData); setAudit(Array.isArray(auditRows) ? auditRows : auditRows?.events || []); } catch (err) { setError(err.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function changeUser(user, changes) { const reason = window.prompt('Reason for this user change:'); if (!reason) return; try { await request(`/platform-admin/users/${user.id}`, { method: 'PUT', body: JSON.stringify({ ...changes, reason }) }); setMessage('User updated and audited.'); await load(); } catch (err) { setError(err.message); } }
  async function changeTenant(tenant) { const reason = window.prompt(`Reason to ${tenant.isActive ? 'suspend' : 'activate'} this tenant:`); if (!reason) return; try { await request(`/platform-admin/tenants/${tenant.id}/status`, { method: 'PUT', body: JSON.stringify({ isActive: !tenant.isActive, reason }) }); setMessage('Tenant status updated and audited.'); await load(); } catch (err) { setError(err.message); } }
  async function toggleFlag(flag) { const reason = window.prompt(`Reason to ${flag.enabled ? 'disable' : 'enable'} ${flag.key}:`); if (!reason) return; try { await request(`/platform-admin/feature-flags/${flag.key}`, { method: 'PUT', body: JSON.stringify({ enabled: !flag.enabled, tenantIds: flag.tenantIds || [], reason }) }); setMessage('Feature flag updated and audited.'); await load(); } catch (err) { setError(err.message); } }
  const roles = ['SUPER_ADMIN','PLATFORM_ADMIN','ADMIN','SUPPORT','TENANT_ADMIN','TENANT_STAFF','MARKETPLACE_USER','BROKER','CARRIER','STAFF'];
  const userColumns = [
    { key: 'user', label: 'User', render: (row) => <><strong>{row.fullName || 'Unnamed'}</strong><div className="muted small">{row.email}</div></> },
    { key: 'role', label: 'Role', render: (row) => <select aria-label={`Role for ${row.email}`} value={row.role} onChange={(event) => changeUser(row, { role: event.target.value })}>{roles.map((role) => <option key={role}>{role}</option>)}</select> },
    { key: 'tenant', label: 'Tenant', render: (row) => row.tenant?.name || 'Platform / Marketplace' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge tone={row.isActive ? 'success' : 'danger'}>{row.isActive ? 'Active' : 'Suspended'}</StatusBadge> },
    { key: 'action', label: 'Action', render: (row) => <button className="btn secondary" onClick={() => changeUser(row, { isActive: !row.isActive })}>{row.isActive ? 'Suspend' : 'Activate'}</button> }
  ];
  const tenantColumns = [
    { key: 'tenant', label: 'Tenant', render: (row) => <><strong>{row.name}</strong><div className="muted small">{row.slug}.loadlyx.com</div></> },
    { key: 'subscription', label: 'Subscription', render: (row) => row.subscription?.planCode || row.subscriptionPlan || 'Not assigned' },
    { key: 'usage', label: 'Usage', render: (row) => `${row._count.users} users · ${row._count.products} products · ${row._count.orders} orders` },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge tone={row.isActive ? 'success' : 'danger'}>{row.isActive ? 'Active' : 'Suspended'}</StatusBadge> },
    { key: 'action', label: 'Action', render: (row) => <button className="btn secondary" onClick={() => changeTenant(row)}>{row.isActive ? 'Suspend' : 'Activate'}</button> }
  ];
  return <main className="container grid" style={{ gap: 24 }}>
    <PageHeader eyebrow="Platform control plane" title="Platform operations" description="Manage accounts, tenants, controlled feature access, integration readiness and system health." />
    {message ? <p className="success" role="status">{message}</p> : null}{error ? <ErrorState message={error} onRetry={load} /> : null}
    {loading ? <LoadingState label="Loading platform operations" /> : <>
      <section className="lx-stat-grid"><StatCard label="Active users" value={summary.activeUsers ?? 0} detail={`${summary.users ?? 0} total`} icon="users" /><StatCard label="Active tenants" value={summary.activeTenants ?? 0} detail={`${summary.tenants ?? 0} total`} tone="violet" icon="store" /><StatCard label="Loads" value={summary.loads ?? 0} detail={`${summary.openDisputes ?? 0} open disputes`} tone="gold" icon="route" /><StatCard label="Orders" value={summary.orders ?? 0} detail={`${summary.openTickets ?? 0} open tickets`} icon="chart" /></section>
      <section className="lx-panel"><div className="lx-panel-header"><div><h2>Platform health</h2><p>Configuration readiness reported by the existing platform health endpoint.</p></div></div><div className="action-row"><StatusBadge tone={health.api === 'ok' ? 'success' : 'warning'}>API: {health.api || 'unknown'}</StatusBadge><StatusBadge tone={health.database === 'ok' ? 'success' : 'warning'}>Database: {health.database || 'unknown'}</StatusBadge><StatusBadge tone={health.stripeConfigured ? 'success' : 'warning'}>Stripe: {health.stripeConfigured ? 'configured' : 'missing'}</StatusBadge><StatusBadge tone={health.emailConfigured ? 'success' : 'warning'}>Email: {health.emailConfigured ? 'configured' : 'missing'}</StatusBadge><StatusBadge>Media: {health.mediaProvider || 'unknown'}</StatusBadge></div></section>
      <section className="lx-panel"><div className="lx-panel-header"><div><h2>Feature flags</h2><p>Changes require an operator reason and create an audit record.</p></div></div><div className="lx-manage-grid">{flags.map((flag) => <article className="lx-manage-card" key={flag.key}><span>F</span><div><strong>{flag.key}</strong><p>{flag.description}</p></div><button className={flag.enabled ? 'btn secondary' : 'btn'} onClick={() => toggleFlag(flag)}>{flag.enabled ? 'Disable' : 'Enable'}</button></article>)}</div></section>
      <section className="lx-panel"><div className="lx-panel-header"><div><h2>Users</h2><p>Role and account status management.</p></div></div><DataTable columns={userColumns} rows={users} emptyTitle="No users found" /></section>
      <section className="lx-panel" id="tenants"><div className="lx-panel-header"><div><h2>Tenants</h2><p>Subscription, usage and operational status.</p></div></div><DataTable columns={tenantColumns} rows={tenants} emptyTitle="No tenants found" /></section>
      <section className="lx-panel" id="audit"><div className="lx-panel-header"><div><h2>Audit logs</h2><p>Recent privileged changes across users, tenants, configuration and finance.</p></div></div><div className="stack-sm">{audit.slice(0, 50).map((event) => <article className="summary-line" key={event.id}><div><strong>{event.action || event.eventType || 'Administrative action'}</strong><div className="muted small">{event.actor?.email || event.actorEmail || 'System'} · {event.reason || event.metadataJson?.reason || 'No reason recorded'}</div></div><time>{event.createdAt ? new Date(event.createdAt).toLocaleString() : ''}</time></article>)}{!audit.length ? <p className="muted">No audit events recorded yet.</p> : null}</div></section>
    </>}
  </main>;
}
