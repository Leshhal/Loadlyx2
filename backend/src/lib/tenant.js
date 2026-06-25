import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function resolveTenant(req) {
const host = req.headers.host || '';
const cleanHost = host.split(':')[0];

const queryTenant = req.query?.tenant;

let tenant = null;

// 1. Try query param (?tenant=demo)
if (queryTenant) {
tenant = await prisma.tenant.findUnique({
where: { slug: queryTenant }
});
}

// 2. Try subdomain (future use)
else if (
cleanHost &&
cleanHost !== 'localhost' &&
cleanHost !== '127.0.0.1'
) {
const parts = cleanHost.split('.');
const subdomain = parts[0];

tenant = await prisma.tenant.findFirst({
where: { subdomain }
});
}

// 3. Fallback (master tenant)
if (!tenant) {
tenant = await prisma.tenant.findFirst({
where: { isMaster: true }
});
}

return tenant;
}