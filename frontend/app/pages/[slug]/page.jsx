import { headers } from 'next/headers';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function getTenantProfile() {
  const host = headers().get('host') || '';
  const cleanHost = host.split(':')[0].toLowerCase();
  let tenantSlug = null;

  if (cleanHost.endsWith('.loadlyx.com')) {
    tenantSlug = cleanHost.replace('.loadlyx.com', '');
  }

  if (!tenantSlug) return null;

  try {
    const res = await fetch(`${API_URL}/tenant/public`, {
      headers: { 'x-tenant-slug': tenantSlug },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function TenantCustomPage({ params }) {
  const tenant = await getTenantProfile();
  const pages = tenant?.branding?.tenantPages || [];
  const page = pages.find((entry) => entry.slug === params.slug);

  if (!tenant || !page) {
    return (
      <main className="container">
        <section className="card">
          <h1>Page not found</h1>
          <p className="muted">This tenant page does not exist.</p>
          <Link href="/" className="btn secondary">Back to home</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card hero tenant-hero">
        <div className="hero-copy">
          <span className="badge">{tenant.name}</span>
          <h1 className="hero-title">{page.title}</h1>
          <p className="lead">{page.navLabel || 'Custom tenant page'}</p>
        </div>
        <div
          className="hero-media tenant-hero-media"
          style={page.heroImageUrl ? { backgroundImage: `linear-gradient(125deg, rgba(6,17,39,0.15), rgba(6,17,39,0.85)), url(${page.heroImageUrl})` } : undefined}
        />
      </section>
      <section className="card">
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{page.content}</div>
      </section>
    </main>
  );
}
