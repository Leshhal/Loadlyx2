import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';

function getHostname(req) {
const host = req.headers.host || '';
return host.split(':')[0].toLowerCase();
}

function extractTenantSlugFromHost(hostname) {
// local dev pattern: cansask.loadlyx.local
if (hostname.endsWith('.loadlyx.local')) {
return hostname.replace('.loadlyx.local', '');
}

// future production pattern: cansask.loadlyx.com
if (hostname.endsWith('.loadlyx.com')) {
return hostname.replace('.loadlyx.com', '');
}

return null;
}

const RESERVED_HOSTS = new Set(['www', 'admin', 'api', 'app', 'support', 'loadlyx', 'loads', 'loadboard']);

export async function tenantMiddleware(req, res, next) {
try {
const hostname = getHostname(req);

let slug =
extractTenantSlugFromHost(hostname) ||
req.headers['x-tenant-slug'] ||
null;

// only use demo/default fallback for local root access like localhost
if (!slug && (hostname === 'localhost' || hostname === '127.0.0.1')) {
slug = env.defaultTenantSlug;
}

if (!slug) {
req.tenant = null;
return next();
}

const normalizedSlug = String(slug).trim().toLowerCase();
if (RESERVED_HOSTS.has(normalizedSlug)) {
req.tenant = null;
return next();
}

const tenant = await prisma.tenant.findFirst({
where: {
OR: [
{ slug: normalizedSlug },
{ subdomain: normalizedSlug }
]
}
});

if (!tenant) {
return res.status(404).json({ error: 'Tenant not found' });
}

if (!tenant.isActive) {
return res.status(403).json({ error: 'Tenant is suspended' });
}

req.tenant = tenant;
next();
} catch (error) {
console.error('Tenant middleware error:', error);
res.status(500).json({ error: 'Failed to resolve tenant' });
}
}
