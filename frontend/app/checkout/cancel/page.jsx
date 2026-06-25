import Link from 'next/link';

export default function CancelPage() {
  return (
    <main className="container">
      <div className="card">
        <h1>Checkout canceled</h1>
        <p className="muted">No payment was captured. Your cart items can be re-added and checked out again.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <Link className="btn" href="/catalog">Return to store</Link>
        </div>
      </div>
    </main>
  );
}
