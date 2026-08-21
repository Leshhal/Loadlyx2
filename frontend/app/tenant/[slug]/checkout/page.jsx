import { notFound } from 'next/navigation';
import Link from 'next/link';
import CheckoutFlow from './checkoutflow';
import CartCheckoutPage from '../../../checkout/page';
import TenantStoreShell from '@/components/TenantStoreShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
async function request(path, tenantSlug) { const response = await fetch(`${API_URL}${path}`, { cache: 'no-store', headers: { 'x-tenant-slug': tenantSlug } }); return response.ok ? response.json() : null; }

export default async function TenantCheckoutPage({ params, searchParams }) {
  const tenant = await request(`/tenant/by-slug/${params.slug}`, params.slug);
  if (!tenant) return notFound();
  if (searchParams?.cart === '1') return <TenantStoreShell tenant={tenant} slug={params.slug}><CartCheckoutPage /></TenantStoreShell>;
  const productSlug = searchParams?.product;
  const quantity = Number(searchParams?.qty || 1);
  if (!productSlug) return notFound();
  const product = await request(`/products/slug/${encodeURIComponent(productSlug)}`, params.slug);
  if (!product) return notFound();
  return <TenantStoreShell tenant={tenant} slug={params.slug}><section className="tenant-checkout-card"><Link href="/catalog" className="text-link">← Back to store</Link><CheckoutFlow product={product} tenantSlug={params.slug} initialQty={quantity} /></section></TenantStoreShell>;
}