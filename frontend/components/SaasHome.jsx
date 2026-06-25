import Link from 'next/link';

export default function SaasHome() {
  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card hero marketing-hero">
        <div className="hero-copy">
          <span className="badge">Modern logistics SaaS</span>
          <div className="hero-kicker">Moving • Brokerage • Supply Sales</div>
          <h1 className="hero-title">The fastest way to run your moving &amp; logistics business</h1>
          <p className="lead">
            Capture quotes, sell supplies, manage loads, and operate your business from one clean platform built for movers, brokers, and shippers.
          </p>
          <div className="action-row">
            <Link className="btn" href="/carriers/signup">Sign up for free</Link>
            <Link className="btn secondary" href="/pricing">View pricing</Link>
          </div>
          <div className="pricing-grid">
            <div className="card pricing-card">
              <span className="badge">Free tier</span>
              <h3>Launch fast</h3>
              <div className="price">$0</div>
              <p className="muted">Start with quotes, storefront basics, and operational visibility.</p>
            </div>
            <div className="card pricing-card featured">
              <span className="badge badge-gold">Paid tier</span>
              <h3>Scale operations</h3>
              <div className="price">Custom</div>
              <p className="muted">Advanced automation, tenant customization, conversion tools, and future commission models.</p>
            </div>
          </div>
        </div>
        <div className="hero-media marketing-hero-media" />
      </section>

      <section className="grid grid-3">
        <div className="card">
          <span className="badge">Load Board</span>
          <h3>Manage load demand</h3>
          <p className="muted">Track quotes, dispatch loads, and turn opportunities into booked jobs.</p>
        </div>
        <div className="card">
          <span className="badge">Online Store</span>
          <h3>Sell moving supplies</h3>
          <p className="muted">Run a branded storefront with conversion tools, promotions, and checkout.</p>
        </div>
        <div className="card">
          <span className="badge">Booking / Quotes</span>
          <h3>Capture and close leads</h3>
          <p className="muted">Generate quotes, follow up faster, and move customers through your pipeline.</p>
        </div>
      </section>
    </main>
  );
}
