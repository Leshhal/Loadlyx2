import { notFound } from 'next/navigation';
import TenantStoreShell from '@/components/TenantStoreShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
async function getTenant(slug) { const response = await fetch(`${API_URL}/tenant/by-slug/${slug}`, { cache: 'no-store' }); return response.ok ? response.json() : null; }

export default async function TenantCustomPage({ params }) {
  const tenant = await getTenant(params.slug);
  if (!tenant) return notFound();
  const page = (tenant.branding?.tenantPages || []).find((item) => item.slug === params.pageSlug);
  if (!page) return notFound();
  return <TenantStoreShell tenant={tenant} slug={params.slug}><section className="card tenant-content-page"><span className="badge">{tenant.name}</span><h1>{page.title}</h1>{page.heroImageUrl ? <img src={page.heroImageUrl} alt={page.title} /> : null}<div className="muted" style={{ whiteSpace: 'pre-wrap' }}>{page.content || ''}</div></section></TenantStoreShell>;
}