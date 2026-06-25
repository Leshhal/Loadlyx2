import Link from 'next/link';

export default function TenantLanding({ tenant }) {
  const branding = tenant?.branding || {};
  const themeStyle = {
    '--tenant-primary': branding.primaryColor || '#2f6df6',
    '--tenant-accent': branding.accentColor || '#f2b843'
  };
  const heroTitle = branding.heroTitle || `${tenant?.name || 'Tenant'} moving store and booking hub`;
  const heroSubtitle = branding.heroSubtitle || 'Book moving support, shop supplies, and start a quote from one branded tenant experience.';
  const serviceHeading = branding.serviceHeading || 'Tenant Storefront';
  const promoBanner = branding.promoBanner || 'Fast quotes, secure checkout, and logistics-ready storefront.';
  const showPromoBanner = Boolean(branding.promoBannerEnabled && promoBanner);
  const trustHeadline = branding.trustHeadline || 'Built for real moving businesses';
  const trustCopy = branding.trustCopy || 'Customize your storefront, trust language, and offers without touching code.';
  const customPages = (branding.tenantPages || []).filter((page) => page?.slug && page?.title);

  return (
    <main className="container grid" style={{ gap: 24, ...themeStyle }}>
      <section className="card hero tenant-hero">
        <div className="hero-copy">
          <div className="stack-sm">
            <span className="badge">{serviceHeading}</span>
            {branding.logoUrl ? <img src={branding.logoUrl} alt={tenant?.name} className="tenant-landing-logo" /> : null}
            <div className="hero-kicker">{tenant?.name || 'Tenant storefront'}</div>
            <h1 className="hero-title">{heroTitle}</h1>
            <p className="lead">{heroSubtitle}</p>
          </div>

          <div className="action-row">
            <Link className="btn" href={`/tenant/${tenant.slug || tenant.subdomain}/catalog`}>Shop Store</Link>
            <Link className="btn secondary" href={`/tenant/${tenant.slug || tenant.subdomain}/quote`}>Request a Quote</Link>
          </div>

          <div className="trust-row">
            {showPromoBanner ? (
              <div className="card trust-card">
                <div className="trust-icon">🏷️</div>
                <div>
                  <strong>{promoBanner}</strong>
                  <div className="muted small">Promotions, brand messaging, and product offers can be customized per tenant.</div>
                </div>
              </div>
            ) : null}
            <div className="card trust-card">
              <div className="trust-icon">✅</div>
              <div>
                <strong>{trustHeadline}</strong>
                <div className="muted small">{trustCopy}</div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="hero-media tenant-hero-media"
          style={branding.pageImageUrl ? { backgroundImage: `linear-gradient(125deg, rgba(6,17,39,0.15), rgba(6,17,39,0.85)), url(${branding.pageImageUrl})` } : undefined}
        />
      </section>

      {customPages.length ? (
        <section className="card">
          <div className="action-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="badge">Custom Pages</span>
              <h3 style={{ marginTop: 10 }}>Build a real business presence</h3>
              <p className="muted">Add custom tenant pages like About, Contact, FAQ, service details, and promotional pages from admin.</p>
            </div>
            <div className="action-row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {customPages.slice(0, 4).map((page) => (
                <Link key={page.slug} className="btn secondary" href={`/tenant/${tenant.slug || tenant.subdomain || tenant.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/pages/${page.slug}`}>{page.navLabel || page.title}</Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid grid-3">
        <div className="card">
          <span className="badge">Branding</span>
          <h3>Tenant-owned experience</h3>
          <p className="muted">Logos, color tones, promotions, messaging, and catalog presentation can be customized per tenant.</p>
          <Link className="btn secondary" href={`/tenant/${tenant.slug || tenant.subdomain}/catalog`}>Browse Catalog</Link>
        </div>
        <div className="card">
          <span className="badge">Quotes</span>
          <h3>Book moving services faster</h3>
          <p className="muted">Capture customer demand, route it into admin workflows, and convert quotes into loads and bookings.</p>
          <Link className="btn secondary" href={`/tenant/${tenant.slug || tenant.subdomain}/quote`}>Start a Quote</Link>
        </div>
        <div className="card">
          <span className="badge">Trust</span>
          <h3>Promotions and confidence boosts</h3>
          <p className="muted">Show trust messaging, deal banners, countdown urgency, and free shipping thresholds directly in-store.</p>
          <Link className="btn secondary" href={`/tenant/${tenant.slug || tenant.subdomain}/catalog`}>See Product Feed</Link>
        </div>
      </section>
    </main>
  );
}
