import { notFound } from 'next/navigation';
import TenantStoreShell from '@/components/TenantStoreShell';
import CheckoutCancelPage from '../../../../checkout/cancel/page';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
async function getTenant(slug) { const response = await fetch(`${API_URL}/tenant/by-slug/${slug}`, { cache: 'no-store' }); return response.ok ? response.json() : null; }
export default async function TenantCheckoutCancelPage({ params }) { const tenant = await getTenant(params.slug); if (!tenant) return notFound(); return <TenantStoreShell tenant={tenant} slug={params.slug}><CheckoutCancelPage /></TenantStoreShell>; }