import { notFound } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getTenant(slug) {
  const res = await fetch(`${API_URL}/tenant/by-slug/${slug}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function TenantCustomPage({ params }) {
  const tenant = await getTenant(params.slug);
  if (!tenant) return notFound();
  const page = (tenant.branding?.tenantPages || []).find((p) => p.slug === params.pageSlug);
  if (!page) return notFound();
  return (
    <main className="container">
      <section className="card">
        <span className="badge">{tenant.name}</span>
        <h1>{page.title}</h1>
        {page.heroImageUrl ? <img src={page.heroImageUrl} alt={page.title} style={{ width: '100%', borderRadius: 18, marginBottom: 18 }} /> : null}
        <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>{page.content || ''}</div>
      </section>
    </main>
  );
}
