import { Router } from 'express';
import { prisma } from '../db/prisma.js';

const router = Router();

function serializeTenant(tenant) {
const branding = tenant.brandingJson || {};

return {
id: tenant.id,
name: tenant.name,
slug: tenant.slug,
subdomain: tenant.subdomain,
primaryDomain: tenant.primaryDomain,
subscriptionPlan: tenant.subscriptionPlan,
branding: {
logoUrl: branding.logoUrl || '',
heroTitle: branding.heroTitle || '',
heroSubtitle: branding.heroSubtitle || '',
primaryColor: branding.primaryColor || '',
accentColor: branding.accentColor || '',
promoBanner: branding.promoBanner || '',
promoBannerEnabled: Boolean(branding.promoBannerEnabled),
trustHeadline: branding.trustHeadline || '',
trustCopy: branding.trustCopy || '',
serviceHeading: branding.serviceHeading || '',
freeShippingEnabled: Boolean(branding.freeShippingEnabled),
countdownEnabled: Boolean(branding.countdownEnabled),
lowStockEnabled: Boolean(branding.lowStockEnabled),
bundleDiscountsEnabled: Boolean(branding.bundleDiscountsEnabled),
freeShippingThreshold: branding.freeShippingThreshold || null,
saleEndsAt: branding.saleEndsAt || '',
pageImageUrl: branding.pageImageUrl || '',
tenantPages: branding.tenantPages || []
}
};
}

router.get('/by-slug/:slug', async (req, res) => {
try {
const raw = String(req.params.slug || '').trim();
const slug = raw.toLowerCase();

const tenants = await prisma.tenant.findMany({
take: 50,
orderBy: { id: 'desc' }
});

const tenant =
tenants.find((t) => String(t.subdomain || '').trim().toLowerCase() === slug) ||
tenants.find((t) => String(t.slug || '').trim().toLowerCase() === slug) ||
tenants.find((t) => String(t.name || '').trim().toLowerCase() === slug);

if (!tenant) {
return res.status(404).json({ error: 'Tenant not found' });
}

return res.json(serializeTenant(tenant));
} catch (error) {
console.error('Tenant by slug error:', error);
return res.status(500).json({ error: 'Failed to load tenant profile' });
}
});

router.get('/public', async (req, res) => {
try {
let tenant = req.tenant || null;

if (!tenant) {
tenant = await prisma.tenant.findFirst({
where: { isMaster: true }
});
} else {
tenant = await prisma.tenant.findUnique({
where: { id: tenant.id }
});
}

if (!tenant) {
return res.status(404).json({ error: 'Tenant not found' });
}

return res.json(serializeTenant(tenant));
} catch (error) {
console.error('Tenant public error:', error);
return res.status(500).json({ error: 'Failed to load tenant profile' });
}
});

export default router;
