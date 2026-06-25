import Link from 'next/link';

export default function AppDashboardPage() {
  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card"><h1>Platform Dashboard</h1><p className="muted">Core workspace for products, quotes, and load operations.</p></section>
      <section className="grid grid-3">
        <Link href="/app/products" className="card quick-link"><strong>Products</strong><p className="muted">Manage catalog and storefront items.</p></Link>
        <Link href="/app/quotes" className="card quick-link"><strong>Quotes</strong><p className="muted">Review quote activity and customer demand.</p></Link>
        <Link href="/app/loadboard" className="card quick-link"><strong>Load Board</strong><p className="muted">View public load opportunities and assignments.</p></Link>
      </section>
    </main>
  );
}
