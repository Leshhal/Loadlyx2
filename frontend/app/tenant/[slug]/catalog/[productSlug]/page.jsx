import Link from 'next/link';
import { notFound } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getProduct(tenantSlug, productSlug) {
const res = await fetch(
`${API_URL}/products/slug/${productSlug}?tenant=${encodeURIComponent(tenantSlug)}`,
{ cache: 'no-store' }
);

if (res.status === 404) return null;
if (!res.ok) return null;

return res.json();
}

export default async function TenantProductPage({ params }) {
const product = await getProduct(params.slug, params.productSlug);

if (!product) return notFound();

const imageUrl =
product.imageUrl ||
product.image ||
product.pageImageUrl ||
product.images?.[0]?.url ||
'';

const price = Number(product.price || 0);

return (
<main style={styles.page}>
<div style={styles.wrap}>
<Link href={`/tenant/${params.slug}/catalog`} style={styles.backLink}>
← Back to catalog
</Link>

<section style={styles.productShell}>
<div>
{imageUrl ? (
<img src={imageUrl} alt={product.name} style={styles.image} />
) : (
<div style={styles.imageFallback}>No image</div>
)}
</div>

<div style={styles.info}>
<div style={styles.badge}>
{product.category?.name || product.category || 'Product'}
</div>

<h1 style={styles.title}>{product.name}</h1>

<p style={styles.description}>
{product.description || 'Product details coming soon.'}
</p>

<div style={styles.price}>
{price > 0 ? `$${price.toFixed(2)}` : '$0.00'}
</div>

<div style={styles.quantityBox}>
<label style={styles.quantityLabel}>Quantity</label>
<input
type="number"
min="1"
defaultValue="1"
style={styles.quantityInput}
/>
</div>

<div style={styles.actions}>
<Link
href={`/tenant/${params.slug}/checkout?product=${product.slug}&qty=1`}
style={styles.primaryButton}
>
Add to Cart
</Link>


<Link href={`/tenant/${params.slug}/catalog`} style={styles.secondaryButton}>
Back to Store
</Link>
</div>
</div>
</section>
</div>
</main>
);
}

const styles = {
page: {
minHeight: '100vh',
background: '#f8fafc',
overflowX: 'hidden',
width: '100%'
},

wrap: {
maxWidth: 1180,
margin: '0 auto',
padding: '32px 18px 80px'
},

backLink: {
display: 'inline-flex',
marginBottom: 18,
color: '#2563eb',
textDecoration: 'none',
fontWeight: 800
},

productShell: {
display: 'grid',
gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
gap: 28,
background: '#fff',
border: '1px solid rgba(15,23,42,0.08)',
borderRadius: 30,
padding: 24,
boxShadow: '0 24px 70px rgba(15,23,42,0.08)'
},

image: {
width: '100%',
maxHeight: 520,
objectFit: 'cover',
borderRadius: 24,
display: 'block'
},

imageFallback: {
width: '100%',
minHeight: 360,
borderRadius: 24,
background: '#e2e8f0',
display: 'grid',
placeItems: 'center',
color: '#64748b',
fontWeight: 700
},

info: {
display: 'flex',
flexDirection: 'column',
justifyContent: 'center'
},

badge: {
width: 'fit-content',
background: 'rgba(37,99,235,0.08)',
color: '#2563eb',
padding: '8px 12px',
borderRadius: 999,
fontWeight: 800,
fontSize: 13,
marginBottom: 18
},

title: {
margin: 0,
color: '#0f172a',
fontSize: 'clamp(36px, 6vw, 58px)',
lineHeight: 1.05,
letterSpacing: -1.4
},

description: {
marginTop: 18,
color: '#475569',
fontSize: 18,
lineHeight: 1.7
},

price: {
marginTop: 20,
fontSize: 28,
fontWeight: 900,
color: '#0f172a'
},

actions: {
display: 'flex',
gap: 14,
flexWrap: 'wrap',
marginTop: 28
},

quantityBox: {
marginTop: 20,
display: 'flex',
flexDirection: 'column',
gap: 8,
maxWidth: 140
},

quantityLabel: {
fontSize: 14,
fontWeight: 800,
color: '#334155'
},

quantityInput: {
padding: '12px 14px',
borderRadius: 12,
border: '1px solid rgba(15,23,42,0.14)',
fontSize: 16,
fontWeight: 800
},

primaryButton: {
background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
color: '#fff',
padding: '16px 24px',
borderRadius: 16,
fontWeight: 900,
fontSize: 16,
border: 'none',
cursor: 'pointer',
boxShadow: '0 12px 30px rgba(37,99,235,0.25)',
width: '100%',
maxWidth: 280
},

secondaryButton: {
background: '#fff',
color: '#0f172a',
textDecoration: 'none',
padding: '15px 22px',
borderRadius: 16,
fontWeight: 900,
border: '1px solid rgba(15,23,42,0.10)'
}
};
