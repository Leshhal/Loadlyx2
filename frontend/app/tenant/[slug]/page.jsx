import Link from 'next/link';
import { notFound } from 'next/navigation';


const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getTenant(slug) {
const res = await fetch(`${API_URL}/tenant/by-slug/${slug}`, {
cache: 'no-store',
headers: {
'Content-Type': 'application/json',
'x-tenant-slug': slug
}
});

if (res.status === 404) return null;

if (!res.ok) {
const text = await res.text();
console.error('Tenant API failed:', res.status, text);
throw new Error('Failed to load tenant');
}

return res.json();
}

async function getFeaturedProducts(slug) {
const res = await fetch(`${API_URL}/products`, {
cache: 'no-store',
headers: {
'Content-Type': 'application/json',
'x-tenant-slug': slug
}
});

if (!res.ok) {
const text = await res.text();
console.error('Products API failed:', res.status, text);
return [];
}

const data = await res.json();

const products = Array.isArray(data)
? data
: data.products || [];

return products.slice(0, 5);
}


function ProductCard({ product, slug }) {
const imageSrc = product?.imageUrl || product?.image || product?.pageImageUrl || '';

return (
<Link
href={product?.slug ? `/tenant/${slug}/catalog/${product.slug}` : `/tenant/${slug}/catalog`}
style={{ textDecoration: 'none', color: 'inherit' }}
>
<div style={styles.productCard}>
{imageSrc ? (
<img src={imageSrc} alt={product.name} style={styles.productImage} />
) : (
<div style={styles.productImageFallback}>No image</div>
)}

<h3 style={styles.productTitle}>{product?.name || 'Product'}</h3>

<p style={styles.productCopy}>
{product?.description
? String(product.description).slice(0, 90)
: 'Moving supply or service product.'}
</p>

<div style={styles.productFooter}>
<strong>${((Number(product?.priceCents || 0)) / 100).toFixed(2)}</strong>
<span style={styles.productButton}>View</span>
</div>
</div>
</Link>
);
}

export default async function TenantHomePage({ params }) {
let tenant = null;
let products = [];

try {
tenant = await getTenant(params.slug);
products = await getFeaturedProducts(params.slug);
} catch (error) {
console.error('Tenant page load error:', error);

return (
<main style={styles.page}>
<section style={styles.card}>
<h1 style={styles.title}>Unable to load tenant</h1>
<p style={styles.copy}>Please try again in a moment.</p>
</section>
</main>
);
}

if (!tenant) return notFound();

const branding = tenant.branding || {};

const tenantName = tenant.name || params.slug;
const logoUrl = branding.logoUrl || '';
const pageImageUrl = branding.pageImageUrl || '';

const heroTitle = branding.heroTitle || tenantName;
const heroSubtitle =
branding.heroSubtitle ||
'Moving services, moving supplies, and delivery solutions built for a faster booking experience.';

const primaryColor = branding.primaryColor || '#2563eb';
const accentColor = branding.accentColor || '#1d4ed8';
const gradient = `linear-gradient(135deg, ${primaryColor}, ${accentColor})`;

const promoBanner = branding.promoBanner || '';
const showPromo = Boolean(branding.promoBannerEnabled && promoBanner);

const showFeaturedProducts =
branding.showFeaturedProducts !== false && products.length > 0;

const trustHeadline =
branding.trustHeadline || 'Reliable moving support from quote to delivery.';

const trustCopy =
branding.trustCopy ||
'We help customers book moving services, request quotes, and access supplies with a simple, organized storefront experience.';

return (
<main style={styles.page}>
<div style={styles.wrap}>
{showPromo ? (
<section style={{ ...styles.banner, background: gradient }}>
{promoBanner}
</section>
) : null}

<section style={styles.hero}>
{pageImageUrl ? (
<img src={pageImageUrl} alt={tenantName} style={styles.heroImage} />
) : null}

<div style={styles.heroBody}>
<div style={{ ...styles.badge, color: primaryColor }}>
{logoUrl ? (
<img src={logoUrl} alt={tenantName} style={styles.logo} />
) : (
<span style={styles.logoDot} />
)}
{tenantName}
</div>

<h1 style={styles.heroTitle}>{heroTitle}</h1>

<p style={styles.heroCopy}>{heroSubtitle}</p>

<Link
href={`/tenant/${params.slug}/quote`}
style={{ ...styles.primaryButton, background: gradient }}
>
Get a Quote
</Link>
</div>
</section>

{showFeaturedProducts ? (
<section style={styles.section}>
<div style={styles.sectionHead}>
<h2 style={styles.sectionTitle}>Featured Products</h2>
<Link href={`/tenant/${params.slug}/catalog`} style={styles.textLink}>
View all
</Link>
</div>

<div style={styles.productGrid}>
{products.slice(0, 5).map((product) => (
<ProductCard key={product.id} product={product} slug={params.slug} />
))}
</div>
</section>
) : null}

<section style={styles.section}>
<div style={styles.card}>
<span style={styles.smallLabel}>Why customers choose us</span>
<h2 style={styles.sectionTitle}>{trustHeadline}</h2>
<p style={styles.copy}>{trustCopy}</p>
</div>
</section>

<section style={styles.loadboardCard}>
<div>
<span style={styles.smallLabelLight}>Loadlyx Loadboard</span>
<h2 style={styles.loadboardTitle}>Visit the Loadboard</h2>
<p style={styles.loadboardCopy}>
Browse available loads and logistics opportunities powered by Loadlyx.
</p>
</div>

<Link href="/loadboard" style={styles.whiteButton}>
Open Loadboard
</Link>
</section>

<footer style={styles.footer}>
<div>
<strong>{tenantName}</strong>
<p style={styles.footerText}>hello@loadlyx.com</p>
<p style={styles.footerText}>Phone: Coming soon</p>
<p style={styles.footerText}>Address: Coming soon</p>
</div>

<div style={styles.socials}>
<span>Socials:</span>
<a href="#" style={styles.socialLink}>Facebook</a>
<a href="#" style={styles.socialLink}>Instagram</a>
<a href="#" style={styles.socialLink}>X</a>
</div>
</footer>
</div>
</main>
);
}

const styles = {
page: {
minHeight: '100vh',
width: '100%',
overflowX: 'hidden',
background: '#f8fafc'
},

wrap: {
maxWidth: 1180,
margin: '0 auto',
padding: '28px 18px 80px'
},

banner: {
color: '#fff',
padding: '14px 18px',
borderRadius: 18,
marginBottom: 20,
fontWeight: 800,
boxShadow: '0 18px 45px rgba(37,99,235,0.22)'
},

hero: {
overflow: 'hidden',
background: '#fff',
border: '1px solid rgba(15,23,42,0.08)',
borderRadius: 30,
boxShadow: '0 24px 70px rgba(15,23,42,0.08)'
},

heroImage: {
width: '100%',
maxHeight: 460,
objectFit: 'cover',
display: 'block'
},

heroBody: {
padding: 30
},

badge: {
display: 'inline-flex',
alignItems: 'center',
gap: 10,
padding: '9px 13px',
borderRadius: 999,
background: 'rgba(37,99,235,0.08)',
fontWeight: 800,
fontSize: 14
},

logo: {
width: 24,
height: 24,
borderRadius: 999,
objectFit: 'cover'
},

logoDot: {
width: 14,
height: 14,
background: '#111827',
display: 'inline-block'
},

heroTitle: {
marginTop: 22,
marginBottom: 14,
fontSize: 'clamp(38px, 7vw, 64px)',
lineHeight: 1.02,
letterSpacing: -1.6,
color: '#0f172a'
},

heroCopy: {
maxWidth: 680,
margin: 0,
color: '#475569',
fontSize: 18,
lineHeight: 1.7
},

primaryButton: {
display: 'inline-flex',
marginTop: 26,
color: '#fff',
textDecoration: 'none',
padding: '16px 24px',
borderRadius: 16,
fontWeight: 900,
boxShadow: '0 14px 35px rgba(37,99,235,0.25)'
},

section: {
marginTop: 30
},

sectionHead: {
display: 'flex',
justifyContent: 'space-between',
alignItems: 'center',
gap: 16,
marginBottom: 16
},

sectionTitle: {
margin: 0,
color: '#0f172a',
fontSize: 30,
lineHeight: 1.15
},

productGrid: {
display: 'grid',
gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
gap: 18
},

productCard: {
background: '#fff',
border: '1px solid rgba(15,23,42,0.08)',
borderRadius: 22,
padding: 16,
boxShadow: '0 14px 38px rgba(15,23,42,0.06)'
},

productImage: {
width: '100%',
height: 170,
objectFit: 'cover',
borderRadius: 16,
display: 'block',
marginBottom: 14
},

productImageFallback: {
height: 170,
borderRadius: 16,
background: '#e2e8f0',
display: 'grid',
placeItems: 'center',
color: '#64748b',
marginBottom: 14
},

productTitle: {
margin: 0,
color: '#0f172a',
fontSize: 17
},

productCopy: {
color: '#64748b',
fontSize: 14,
lineHeight: 1.5
},

productFooter: {
display: 'flex',
justifyContent: 'space-between',
alignItems: 'center',
gap: 12
},

productButton: {
background: '#0f172a',
color: '#fff',
padding: '8px 12px',
borderRadius: 999,
fontSize: 13,
fontWeight: 800
},

card: {
background: '#fff',
border: '1px solid rgba(15,23,42,0.08)',
borderRadius: 24,
padding: 28,
boxShadow: '0 16px 45px rgba(15,23,42,0.06)'
},

smallLabel: {
display: 'inline-flex',
padding: '8px 12px',
borderRadius: 999,
background: 'rgba(15,23,42,0.05)',
color: '#334155',
fontWeight: 800,
fontSize: 13,
marginBottom: 16
},

copy: {
margin: 0,
color: '#475569',
lineHeight: 1.7
},

loadboardCard: {
marginTop: 30,
background: 'linear-gradient(135deg,#0f172a,#1e3a8a)',
color: '#fff',
borderRadius: 28,
padding: 30,
display: 'grid',
gap: 22,
boxShadow: '0 20px 60px rgba(15,23,42,0.18)'
},

smallLabelLight: {
color: 'rgba(255,255,255,0.75)',
fontWeight: 800,
fontSize: 13
},

loadboardTitle: {
marginTop: 10,
marginBottom: 10,
fontSize: 32
},

loadboardCopy: {
margin: 0,
color: 'rgba(255,255,255,0.78)',
lineHeight: 1.7
},

whiteButton: {
width: 'fit-content',
background: '#fff',
color: '#0f172a',
textDecoration: 'none',
padding: '14px 20px',
borderRadius: 16,
fontWeight: 900
},

footer: {
marginTop: 34,
padding: 24,
borderRadius: 24,
background: '#fff',
border: '1px solid rgba(15,23,42,0.08)',
display: 'grid',
gap: 20
},

footerText: {
margin: '8px 0 0',
color: '#64748b'
},

socials: {
display: 'flex',
gap: 12,
flexWrap: 'wrap',
alignItems: 'center'
},

socialLink: {
color: '#2563eb',
fontWeight: 800,
textDecoration: 'none'
},

textLink: {
color: '#2563eb',
fontWeight: 800,
textDecoration: 'none'
}
};
