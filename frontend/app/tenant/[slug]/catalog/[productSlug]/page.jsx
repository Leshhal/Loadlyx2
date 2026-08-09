import { notFound } from 'next/navigation';
import TenantProductDetail from '@/components/TenantProductDetail';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function getProduct(tenantSlug, productSlug) {
  const response = await fetch(`${API_URL}/products/slug/${encodeURIComponent(productSlug)}`, {
    cache: 'no-store',
    headers: { 'x-tenant-slug': tenantSlug }
  });
  if (!response.ok) return null;
  return response.json();
}

export default async function TenantProductPage({ params }) {
  const product = await getProduct(params.slug, params.productSlug);
  if (!product) notFound();
  return <TenantProductDetail product={product} tenantSlug={params.slug} />;
}
