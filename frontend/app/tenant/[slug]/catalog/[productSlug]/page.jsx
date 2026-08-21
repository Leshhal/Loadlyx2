import { notFound } from 'next/navigation';
import TenantProductDetail from '@/components/TenantProductDetail';
import TenantStoreShell from '@/components/TenantStoreShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
async function request(path, tenantSlug) { const response = await fetch(`${API_URL}${path}`, { cache: 'no-store', headers: { 'x-tenant-slug': tenantSlug } }); return response.ok ? response.json() : null; }

export default async function TenantProductPage({ params }) {
  const [tenant, product] = await Promise.all([request(`/tenant/by-slug/${params.slug}`, params.slug), request(`/products/slug/${encodeURIComponent(params.productSlug)}`, params.slug)]);
  if (!tenant || !product) return notFound();
  return <TenantStoreShell tenant={tenant} slug={params.slug}><TenantProductDetail product={product} tenantSlug={params.slug} /></TenantStoreShell>;
}