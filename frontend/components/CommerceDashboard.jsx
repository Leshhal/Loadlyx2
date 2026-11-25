'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminFetch } from '../lib/adminFetch';
import { ErrorState, LoadingState, PageHeader, StatCard, StatusBadge } from './ui/LoadlyxUI';

export default function CommerceDashboard() {
  const [onboarding, setOnboarding] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all(['/admin/commerce-onboarding', '/admin/dashboard'].map(async (path) => {
      const response = await adminFetch(path);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load store dashboard');
      return data;
    })).then(([setup, metrics]) => {
      if (!cancelled) {
        setOnboarding(setup);
        setDashboard(metrics);
      }
    }).catch((failure) => {
      if (!cancelled) setError(failure.message);
    });
    return () => { cancelled = true; };
  }, []);

  return <main className="container grid" style={{ gap: 24 }}>
    <PageHeader title="Your store" description="Complete your store setup and review the remaining requirements before publishing." />
    {error ? <ErrorState message={error} /> : !onboarding ? <LoadingState label="Checking store setup" /> : <>
      <section className="grid grid-4" id="analytics" aria-label="Store analytics">
        <StatCard label="Total orders" value={dashboard?.stats?.totalOrders ?? 0} icon="store" />
        <StatCard label="Paid order totals" value={new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format((dashboard?.stats?.totalRevenueCents ?? 0) / 100)} detail="Gross CAD order amounts" icon="chart" />
        <StatCard label="Orders today" value={dashboard?.stats?.ordersToday ?? 0} icon="store" />
      </section>
      <section className="card">
        <h2>Store setup</h2>
        <StatusBadge tone={onboarding.ready ? 'success' : 'warning'}>{onboarding.storefrontStatus || 'SETUP_REQUIRED'}</StatusBadge>
        <ol className="stack-sm">
          {(onboarding.checklist || []).map((step) => <li key={step.key}>
            <strong>{step.label}</strong>{' '}
            <span>{step.complete ? 'Complete' : (step.status || 'Setup required').replaceAll('_', ' ').toLowerCase()}</span>
          </li>)}
        </ol>
        {onboarding.blockers?.length ? <div role="status"><h3>Requirements remaining</h3><ul>
          {onboarding.blockers.map((blocker, index) => <li key={typeof blocker === 'string' ? blocker : blocker.key || index}>
            {typeof blocker === 'string' ? blocker : blocker.message || blocker.label || blocker.code}
          </li>)}
        </ul></div> : null}
      </section>
    </>}
    <section className="card"><h2>Manage your store</h2><div className="action-row">
      <Link className="btn" href="/app/products">Products & inventory</Link>
      <Link className="btn secondary" href="/admin/manage/orders">Orders</Link>
      <Link className="btn secondary" href="/admin/tenant">Store settings & branding</Link>
      <Link className="btn secondary" href="/admin/payments">Payment connections</Link>
      <Link className="btn secondary" href="/admin/balance">Ledger & withdrawals</Link>
    </div></section>
  </main>;
}
