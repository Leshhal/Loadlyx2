import { notFound, permanentRedirect } from 'next/navigation';
import TenantProductDetail from '@/components/TenantProductDetail';
import TenantStoreShell from '@/components/TenantStoreShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
async function request(path, tenantSlug) { const response = await fetch(`${API_URL}${path}`, { cache: 'no-store', headers: { 'x-tenant-slug': tenantSlug } }); return response.ok ? response.json() : null; }

export async function generateMetadata({ params }) {
  const product = await request(`/products/slug/${encodeURIComponent(params.productSlug)}`, params.slug);
  if (!product) return {};
  const canonical = product.canonicalUrl || `https://${params.slug}.loadlyx.com/catalog/${product.slug}`;
  return { title: product.seoTitle || `${product.name} | ${params.slug === 'movingsupplies' ? 'Moving Supplies' : 'Loadlyx Store'}`, description: product.metaDescription || product.description, alternates: { canonical } };
}

export default async function TenantProductPage({ params }) {
  const [tenant, product] = await Promise.all([request(`/tenant/by-slug/${params.slug}`, params.slug), request(`/products/slug/${encodeURIComponent(params.productSlug)}`, params.slug)]);
  if (!tenant) return notFound();
  if (!product && params.slug === 'cansask') {
    const moved = await request(`/products/slug/${encodeURIComponent(params.productSlug)}`, 'movingsupplies');
    if (moved) permanentRedirect(`https://movingsupplies.loadlyx.com/catalog/${moved.slug}`);
  }
  if (!product) return notFound();
  return <TenantStoreShell tenant={tenant} slug={params.slug}><TenantProductDetail product={product} tenantSlug={params.slug} /></TenantStoreShell>;
}