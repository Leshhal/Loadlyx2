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
footerHeading: branding.footerHeading || tenant.name,
footerDescription: branding.footerDescription || '',
contactEmail: branding.contactEmail || tenant.email || '',
contactPhone: branding.contactPhone || '',
contactAddress: branding.contactAddress || '',
facebookUrl: branding.facebookUrl || '',
instagramUrl: branding.instagramUrl || '',
xUrl: branding.xUrl || '',
linkedinUrl: branding.linkedinUrl || '',
tenantPages: branding.tenantPages || []
},
theme: tenant.themeActivation ? {
key: tenant.themeActivation.theme.key,
name: tenant.themeActivation.theme.name,
version: tenant.themeActivation.theme.version,
settings: tenant.themeActivation.settingsJson
} : null
};
}

router.get('/by-slug/:slug', async (req, res) => {
try {
const raw = String(req.params.slug || '').trim();
const slug = raw.toLowerCase();

const tenant = await prisma.tenant.findFirst({
where: { OR: [{ subdomain: slug }, { slug }] },
include: { themeActivation: { include: { theme: true } } }
});

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
where: { isMaster: true },
include: { themeActivation: { include: { theme: true } } }
});
} else {
tenant = await prisma.tenant.findUnique({
where: { id: tenant.id },
include: { themeActivation: { include: { theme: true } } }
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
