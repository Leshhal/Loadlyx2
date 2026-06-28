const RESERVED_SUBDOMAINS = [
'www',
'app',
'admin',
'api',
'loadlyx',
'localhost'
];

export function getTenantSlug() {
if (typeof window === 'undefined') {
return null;
}

const host = window.location.hostname;

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