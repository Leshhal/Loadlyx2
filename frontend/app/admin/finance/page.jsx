'use client';
import { useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';
import { DataTable, ErrorState, LoadingState, PageHeader, StatCard, StatusBadge } from '../../../components/ui/LoadlyxUI';
const money = (value) => `$${((value || 0) / 100).toFixed(2)}`;
const tenantLabel = (row) => row.tenant?.name || (row.tenantId ? `Unknown tenant (${row.tenantId.slice(-8)})` : 'Loadlyx platform');

export default function FinanceAdminPage() {
  const [summary, setSummary] = useState(null); const [policies, setPolicies] = useState([]); const [error, setError] = useState('');
  useEffect(() => { Promise.all([adminFetch('/finance/admin/summary'), adminFetch('/finance/admin/policies')]).then(async ([summaryResponse, policyResponse]) => { const summaryData = await summaryResponse.json(); const policyData = await policyResponse.json(); if (!summaryResponse.ok) throw new Error(summaryData.error || 'Unable to load finance summary'); if (!policyResponse.ok) throw new Error(policyData.error || 'Unable to load policies'); setSummary(summaryData); setPolicies(policyData.policies || []); }).catch((err) => setError(err.message)); }, []);
  const policyColumns = [
    { key: 'tenant', label: 'Tenant', render: (row) => <div><strong>{tenantLabel(row)}</strong><div className="muted small">{row.tenant?.slug || row.scopeKey}</div></div> },
    { key: 'store', label: 'Store commission', render: (row) => <StatusBadge tone="success">{(row.storeCommissionBps / 100).toFixed(2)}%</StatusBadge> },
    { key: 'marketplace', label: 'Marketplace commission', render: (row) => <StatusBadge tone="success">{(row.marketplaceCommissionBps / 100).toFixed(2)}%</StatusBadge> }
  ];
  const revenueColumns = [
    { key: 'tenant', label: 'Tenant', render: (row) => <div><strong>{tenantLabel(row)}</strong><div className="muted small">{row.tenant?.slug || 'platform'}</div></div> },
    { key: 'kind', label: 'Transaction', render: (row) => <strong>{row.kind}</strong> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge tone={row.status === 'SETTLED' || row.status === 'AVAILABLE' ? 'success' : 'warning'}>{row.status}</StatusBadge> },
    { key: 'gross', label: 'Gross', render: (row) => money(row.grossCents) },
    { key: 'revenue', label: 'Loadlyx revenue', render: (row) => <strong>{money(row.platformCommissionCents)}</strong> }
  ];
  const withdrawalColumns = [
    { key: 'tenant', label: 'Tenant', render: (row) => <div><strong>{tenantLabel(row)}</strong><div className="muted small">{row.tenant?.slug}</div></div> },
    { key: 'amount', label: 'Amount', render: (row) => <strong>{money(row.amountCents)}</strong> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
    { key: 'requested', label: 'Requested', render: (row) => new Date(row.createdAt).toLocaleDateString('en-CA') }
  ];
  return <main className="container"><PageHeader eyebrow="Revenue intelligence" title="Platform finance" description="Reconcile subscription, store, and marketplace revenue using tenant names, immutable transaction records, and payout status." />{error ? <ErrorState message={error} /> : !summary ? <LoadingState label="Loading financial ledger" /> : <><section className="lx-stat-grid"><StatCard label="Platform revenue" value={money(summary.platformRevenueCents)} detail="Recognized commission and subscription revenue" icon="chart" /><StatCard label="Pending payouts" value={money(summary.pendingPayouts?._sum?.amountCents)} detail="Funds awaiting release" tone="orange" icon="alert" /><StatCard label="Payout requests" value={summary.pendingPayouts?._count || 0} detail="Items requiring review" tone="purple" icon="users" /><StatCard label="Commission policies" value={policies.length} detail="Active calculation scopes" tone="green" icon="check" /></section><section className="lx-panel" style={{ marginTop: 20 }}><h2>Recent transactions</h2><DataTable columns={revenueColumns} rows={summary.recentTransactions || []} emptyTitle="No transactions" emptyDescription="Ledger-backed activity will appear here." /></section><section className="lx-panel" style={{ marginTop: 20 }}><h2>Withdrawals</h2><DataTable columns={withdrawalColumns} rows={summary.withdrawals || []} emptyTitle="No withdrawals" emptyDescription="Tenant payout requests will appear here." /></section><section className="lx-panel" style={{ marginTop: 20 }}><h2>Commission policy</h2><DataTable columns={policyColumns} rows={policies} emptyTitle="No policies configured" emptyDescription="Configure a commission policy before processing marketplace funds." /></section></>}</main>;
}
