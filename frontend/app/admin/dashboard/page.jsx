'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminFetch } from '../../../lib/adminFetch';
import { EmptyState, PageHeader, StatCard, StatusBadge } from '../../../components/ui/LoadlyxUI';

function money(cents = 0) {
return new Intl.NumberFormat('en-CA', {
style: 'currency',
currency: 'CAD'
}).format((cents || 0) / 100);
}

function formatDate(value) {
if (!value) return '—';
return new Date(value).toLocaleString('en-CA', {
month: 'short',
day: 'numeric',
hour: '2-digit',
minute: '2-digit'
});
}

function SourceList({ rows = [], revenue = false }) {
const max = useMemo(
() => Math.max(...rows.map((row) => row.count || 0), 1),
[rows]
);

if (!rows.length) {
return <p className="muted">No attribution data yet.</p>;
}

return (
<div className="stack-sm">
{rows.map((row) => (
<div key={row.source} className="stack-xs">
<div className="row-between">
<span style={{ textTransform: 'capitalize' }}>{row.source}</span>
<strong>{row.count}</strong>
</div>
<div className="meter">
<span style={{ width: `${((row.count || 0) / max) * 100}%` }} />
</div>
{revenue ? (
<div className="muted small">Revenue: {money(row.revenueCents || 0)}</div>
) : null}
</div>
))}
</div>
);
}

export default function AdminDashboardPage() {
const router = useRouter();
const [data, setData] = useState(null);
const [error, setError] = useState('');
const [loading, setLoading] = useState(true);

useEffect(() => {
const run = async () => {
const token = localStorage.getItem('token');
const tenantSlug = localStorage.getItem('tenantSlug');

if (!token) {
router.replace('/login');
return;
}

try {
const res = await adminFetch('/admin/dashboard');

if (res.status === 401) {
setError('Unauthorized');
router.replace('/login');
return;
}

const json = await res.json();
setData(json);
} catch (err) {
setError('Something went wrong');
} finally {
setLoading(false);
}
};

run();
}, [router]);

const stats = data?.stats;

return (
<main className="container grid" style={{ gap: 24 }}>
<PageHeader eyebrow="Platform command" title="Operations at a glance" description="Start with what requires attention, then move through revenue, demand, and recent platform activity." actions={
<>
<Link className="btn" href="/admin/manage">
Open management
</Link>
<Link className="btn secondary" href="/admin/seo">
SEO Tools
</Link>
</>} />

{error ? (
<section className="card">
<p className="error">{error}</p>
</section>
) : null}

{stats ? (
<>
<section className="grid grid-4">
<StatCard label="Quotes today" value={stats.quotesToday} detail="New demand captured" icon="users" />
<StatCard label="Orders today" value={stats.ordersToday} detail="Checkout completions" icon="store" tone="green" />
<StatCard label="Revenue today" value={money(stats.revenueTodayCents)} detail="Paid, attributed revenue" icon="chart" tone="gold" />
<StatCard label="Pending loads" value={stats.pendingLoads} detail="Ready for carrier matching" icon="route" tone="red" />
</section>

<section className="card">
<div className="panel-header">
<div>
<StatusBadge tone="success">Lifetime metrics</StatusBadge>
<h2 style={{ margin: '10px 0 0' }}>Totals across your tenant</h2>
</div>
</div>

<div className="grid grid-4">
<div>
<div className="muted">Total Quotes</div>
<div className="metric-lg">{stats.totalQuotes}</div>
</div>
<div>
<div className="muted">Total Loads</div>
<div className="metric-lg">{stats.totalLoads}</div>
</div>
<div>
<div className="muted">Total Orders</div>
<div className="metric-lg">{stats.totalOrders}</div>
</div>
<div>
<div className="muted">Total Revenue</div>
<div className="metric-lg">{money(stats.totalRevenueCents)}</div>
</div>
</div>
</section>
</>
) : (
<section className="card">
<p className="muted">Loading dashboard...</p>
</section>
)}

<section className="grid grid-2">
<div className="card">
<h2>Quote Sources</h2>
<SourceList rows={data?.attribution?.quoteSources || []} />
</div>

<div className="card">
<h2>Order Sources</h2>
<SourceList rows={data?.attribution?.orderSources || []} revenue />
</div>
</section>

<section className="grid grid-2">
<div className="card">
<div className="row-between">
<h2>Top Products</h2>
<Link href="/admin/manage/products" className="text-link">
Manage products
</Link>
</div>

<table className="table">
<thead>
<tr>
<th>Product</th>
<th>Units Sold</th>
</tr>
</thead>
<tbody>
{(data?.topProducts || []).map((item, index) => (
<tr key={`${item.productId || item.productName}-${index}`}>
<td>{item.productName}</td>
<td>{item.quantity}</td>
</tr>
))}
</tbody>
</table>
{!(data?.topProducts || []).length ? <EmptyState title="No product performance yet" description="Product sales will appear after paid store orders are recorded." actionHref="/admin/manage/products" actionLabel="Manage products" /> : null}
</div>

<div className="card">
<div className="row-between">
<h2>Quick Actions</h2>
<Link href="/catalog" className="text-link">
View store
</Link>
</div>

<div className="grid grid-2 quick-actions">
<Link href="/admin/manage/products" className="card quick-link">
<strong>Products</strong>
<span className="muted small">Catalog, weights, SEO</span>
</Link>

<Link href="/admin/manage/categories" className="card quick-link">
<strong>Categories</strong>
<span className="muted small">Collections and organization</span>
</Link>

<Link href="/admin/manage/quotes" className="card quick-link">
<strong>Quotes</strong>
<span className="muted small">Demand and item lists</span>
</Link>

<Link href="/admin/manage/loads" className="card quick-link">
<strong>Loads</strong>
<span className="muted small">Pending freight opportunities</span>
</Link>

<Link href="/admin/manage/orders" className="card quick-link">
<strong>Orders</strong>
<span className="muted small">Revenue and fulfillment</span>
</Link>

<Link href="/admin/seo" className="card quick-link">
<strong>SEO Tools</strong>
<span className="muted small">Fix weak product pages</span>
</Link>
</div>
</div>
</section>

<section className="grid grid-3">
<div className="card">
<div className="row-between">
<h2>Recent Quotes</h2>
<Link href="/admin/manage/quotes" className="text-link">
All quotes
</Link>
</div>

<div className="stack-sm">
{(data?.recentQuotes || []).map((quote) => (
<div key={quote.id} className="item-line">
<div>
<strong>{quote.fullName}</strong>
<div className="muted small">
{quote.fromCity} → {quote.toCity}
</div>
<div className="muted small">
{quote.attributionUtmSource || 'direct/unknown'}
</div>
</div>
<div className="muted small">{formatDate(quote.createdAt)}</div>
</div>
))}
</div>
</div>

<div className="card">
<div className="row-between">
<h2>Recent Orders</h2>
<Link href="/admin/manage/orders" className="text-link">
All orders
</Link>
</div>

<div className="stack-sm">
{(data?.recentOrders || []).map((order) => (
<div key={order.id} className="item-line">
<div>
<strong>{order.customerName || order.customerEmail}</strong>
<div className="muted small">
{order.status} · {order.items?.length || 0} items
</div>
</div>
<div className="muted small">{money(order.totalCents)}</div>
</div>
))}
</div>
</div>

<div className="card">
<div className="row-between">
<h2>Recent Loads</h2>
<Link href="/admin/manage/loads" className="text-link">
All loads
</Link>
</div>

<div className="stack-sm">
{(data?.recentLoads || []).map((load) => (
<div key={load.id} className="item-line">
<div>
<strong>{load.status}</strong>
<div className="muted small">
{load.originCity} → {load.destinationCity}
</div>
</div>
<div className="muted small">{formatDate(load.createdAt)}</div>
</div>
))}
</div>
</div>
</section>
</main>
);
}
