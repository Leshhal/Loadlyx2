import { notFound } from 'next/navigation';
import Link from 'next/link';
import CheckoutFlow from './checkoutflow';


const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getProduct(tenantSlug, productSlug) {
const res = await fetch(`${API_URL}/products/slug/${productSlug}`, {
cache: 'no-store',
headers: {
'x-tenant-slug': tenantSlug
}
});

if (!res.ok) return null;
return res.json();
}

export default async function TenantCheckoutPage({ params, searchParams }) {
const productSlug = searchParams?.product;
const quantity = Number(searchParams?.qty || 1);

if (!productSlug) return notFound();

const product = await getProduct(params.slug, productSlug);

if (!product) return notFound();

const priceCents = Number(product.priceCents || Math.round(Number(product.price || 0) * 100));
const subtotalCents = priceCents * quantity;

const platformFeeRate = 0.08; // Loadlyx fee, adjust later
const platformFeeCents = Math.round(subtotalCents * platformFeeRate);
const tenantNetCents = subtotalCents - platformFeeCents;

return (
<main style={styles.page}>
<section style={styles.card}>
<Link href={`/tenant/${params.slug}/catalog`} style={styles.backLink}>
← Back to Store
</Link>

<CheckoutFlow
product={product}
tenantSlug={params.slug}
initialQty={quantity}
/>
</section>
</main>
);
}

const styles = {
page: {
minHeight: '100vh',
background: '#f8fafc',
padding: 24
},
card: {
maxWidth: 760,
margin: '0 auto',
background: '#fff',
borderRadius: 24,
padding: 28,
border: '1px solid rgba(15,23,42,0.08)',
boxShadow: '0 18px 50px rgba(15,23,42,0.08)'
},
backLink: {
display: 'inline-block',
marginBottom: 18,
color: '#2563eb',
fontWeight: 800,
textDecoration: 'none'
},
badge: {
display: 'inline-flex',
background: '#0f172a',
color: '#fff',
padding: '8px 12px',
borderRadius: 999,
fontSize: 13,
fontWeight: 800
},
title: {
margin: '18px 0 0',
fontSize: 38,
color: '#0f172a'
},
copy: {
color: '#64748b',
lineHeight: 1.6
},
item: {
marginTop: 24,
padding: 20,
borderRadius: 18,
background: '#f8fafc',
display: 'flex',
justifyContent: 'space-between',
gap: 20
},
productName: {
margin: 0,
color: '#0f172a'
},
meta: {
margin: '8px 0 0',
color: '#64748b'
},
total: {
fontSize: 24,
color: '#0f172a'
},
summary: {
marginTop: 22,
borderTop: '1px solid rgba(15,23,42,0.08)',
paddingTop: 18
},
row: {
display: 'flex',
justifyContent: 'space-between',
gap: 16,
marginTop: 10,
color: '#334155'
},
button: {
marginTop: 24,
width: '100%',
background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
color: '#fff',
border: 'none',
borderRadius: 16,
padding: '16px 22px',
fontSize: 16,
fontWeight: 900,
cursor: 'pointer'
}
};