const RESERVED_SUBDOMAINS = [
'www',
'app',
'admin',
'api',
'loadlyx',
'localhost',
'loads',
'loadboard'
];

export function tenantSlugFromPath(pathname = '') {
const match = String(pathname).match(/^\/tenant\/([^/]+)(?:\/|$)/i);
if (!match) return null;
const slug = decodeURIComponent(match[1]).trim().toLowerCase();
return /^[a-z0-9][a-z0-9-]{1,62}$/.test(slug) && !RESERVED_SUBDOMAINS.includes(slug) ? slug : null;
}

export function getTenantSlug() {
if (typeof window === 'undefined') {
return null;
}

const host = window.location.hostname;
const pathSlug = tenantSlugFromPath(window.location.pathname);
if (pathSlug) {
localStorage.setItem('tenantSlug', pathSlug);
return pathSlug;
}

// localhost fallback
if (host === 'localhost' || host === '127.0.0.1') {
return (
localStorage.getItem('tenantSlug') ||
localStorage.getItem('tenant') ||
'demo'
);
}

// production subdomain: cansask.loadlyx.com
if (host.endsWith('.loadlyx.com')) {
const subdomain = host.split('.')[0];

if (
subdomain &&
!RESERVED_SUBDOMAINS.includes(subdomain)
) {
localStorage.setItem('tenantSlug', subdomain);
return subdomain;
}
}

// vercel fallback
return (
localStorage.getItem('tenantSlug') ||
localStorage.getItem('tenant') ||
null
);
}

export function getTenantHeaders() {
const tenantSlug = getTenantSlug();

return tenantSlug
? {
'x-tenant-slug': tenantSlug
}
: {};
}
