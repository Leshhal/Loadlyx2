import { requireAuth, requireAdmin } from '../middleware/requireauth.js';
import { Router } from 'express';
import { prisma } from '../db/prisma.js';

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeTenantPages(pages = []) {
  if (!Array.isArray(pages)) return [];
  return pages
    .map((page) => ({
      title: String(page?.title || '').trim(),
      slug: slugify(page?.slug || page?.title || ''),
      navLabel: String(page?.navLabel || '').trim(),
      content: String(page?.content || '').trim(),
      heroImageUrl: String(page?.heroImageUrl || '').trim(),
      showInNav: Boolean(page?.showInNav)
    }))
    .filter((page) => page.title && page.slug);
}

function sanitizeBranding(input = {}) {
  return {
    logoUrl: String(input.logoUrl || '').trim(),
    heroTitle: String(input.heroTitle || '').trim(),
    heroSubtitle: String(input.heroSubtitle || '').trim(),
    primaryColor: String(input.primaryColor || '').trim(),
    accentColor: String(input.accentColor || '').trim(),
    trustHeadline: String(input.trustHeadline || '').trim(),
    trustCopy: String(input.trustCopy || '').trim(),
    serviceHeading: String(input.serviceHeading || '').trim(),
    pageImageUrl: String(input.pageImageUrl || '').trim(),
    tenantPages: sanitizeTenantPages(input.tenantPages || []),

    // merchandising fields intentionally kept in data model but edited from Product / Store admin
    promoBanner: String(input.promoBanner || '').trim(),
    promoBannerEnabled: Boolean(input.promoBannerEnabled),
    freeShippingThreshold: input.freeShippingThreshold === '' || input.freeShippingThreshold == null ? null : String(input.freeShippingThreshold).trim(),
    freeShippingEnabled: Boolean(input.freeShippingEnabled),
    saleEndsAt: String(input.saleEndsAt || '').trim(),
    countdownEnabled: Boolean(input.countdownEnabled),
    lowStockEnabled: Boolean(input.lowStockEnabled),
    bundleDiscountsEnabled: Boolean(input.bundleDiscountsEnabled)
  };
}

function serializeTenantSettings(tenant) {
  const branding = sanitizeBranding(tenant.brandingJson || {});
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    subdomain: tenant.subdomain || '',
    primaryDomain: tenant.primaryDomain || '',
    branding
  };
}

async function buildDashboard(tenantId) {
  const today = startOfToday();

  const [
    totalQuotes,
    totalLoads,
    totalOrders,
    totalRevenue,
    quotesToday,
    ordersToday,
    revenueToday,
    pendingLoads,
    recentQuotes,
    recentLoads,
    recentOrders,
    quoteSources,
    orderSources,
    topOrderItems
  ] = await Promise.all([
    prisma.quote.count({ where: { tenantId } }),
    prisma.load.count({ where: { tenantId } }),
    prisma.order.count({ where: { tenantId } }),
    prisma.order.aggregate({ where: { tenantId, status: 'PAID' }, _sum: { totalCents: true } }),
    prisma.quote.count({ where: { tenantId, createdAt: { gte: today } } }),
    prisma.order.count({ where: { tenantId, createdAt: { gte: today } } }),
    prisma.order.aggregate({ where: { tenantId, status: 'PAID', createdAt: { gte: today } }, _sum: { totalCents: true } }),
    prisma.load.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.quote.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 8, include: { load: true } }),
    prisma.load.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 8, include: { quote: true } }),
    prisma.order.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 8, include: { items: true } }),
    prisma.quote.groupBy({ by: ['attributionUtmSource'], where: { tenantId }, _count: { _all: true } }),
    prisma.order.groupBy({ by: ['attributionUtmSource'], where: { tenantId }, _count: { _all: true }, _sum: { totalCents: true } }),
    prisma.orderItem.findMany({ where: { order: { tenantId } }, select: { productId: true, productName: true, quantity: true } })
  ]);

  const productMap = new Map();
  for (const item of topOrderItems) {
    const key = item.productId || item.productName;
    const current = productMap.get(key) || { productId: item.productId, productName: item.productName, quantity: 0 };
    current.quantity += item.quantity;
    productMap.set(key, current);
  }

  const topProducts = [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  return {
    stats: {
      totalQuotes,
      totalLoads,
      totalOrders,
      totalRevenueCents: totalRevenue._sum.totalCents || 0,
      quotesToday,
      ordersToday,
      revenueTodayCents: revenueToday._sum.totalCents || 0,
      pendingLoads
    },
    recentQuotes,
    recentLoads,
    recentOrders,
    attribution: {
      quoteSources: quoteSources.map((row) => ({ source: row.attributionUtmSource || 'direct/unknown', count: row._count._all })).sort((a, b) => b.count - a.count).slice(0, 5),
      orderSources: orderSources.map((row) => ({ source: row.attributionUtmSource || 'direct/unknown', count: row._count._all, revenueCents: row._sum.totalCents || 0 })).sort((a, b) => b.count - a.count).slice(0, 5)
    },
    topProducts
  };
}

router.get('/stats', async (req, res) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  const dashboard = await buildDashboard(tenantId);
  res.json({
    stats: {
      totalQuotes: dashboard.stats.totalQuotes,
      totalLoads: dashboard.stats.totalLoads,
      totalOrders: dashboard.stats.totalOrders,
      totalRevenueCents: dashboard.stats.totalRevenueCents
    },
    recentQuotes: dashboard.recentQuotes.slice(0, 5),
    recentLoads: dashboard.recentLoads.slice(0, 5),
    attribution: dashboard.attribution
  });
});

router.get('/dashboard', async (req, res) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  const dashboard = await buildDashboard(tenantId);
  res.json(dashboard);
});

router.get('/carriers', async (req, res) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });
  const carriers = await prisma.carrierProfile.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  res.json(carriers);
});

router.get('/seo/missing', async (req, res) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

  const products = await prisma.product.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [
        { seoTitle: null },
        { metaDescription: null },
        { images: { none: {} } },
        { images: { some: { altText: null } } },
        { productTags: { none: {} } }
      ]
    },
    include: {
      images: { orderBy: { position: 'asc' } },
      productTags: { include: { tag: true } },
      category: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  res.json(products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category?.name || null,
    seoTitle: product.seoTitle,
    metaDescription: product.metaDescription,
    imageCount: product.images.length,
    missingAltCount: product.images.filter((image) => !image.altText).length,
    tags: product.productTags.map((item) => item.tag.name)
  })));
});

// Current tenant settings for admin edit mode
router.get('/tenant-settings', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    res.json(serializeTenantSettings(tenant));
  } catch (error) {
    console.error('Admin tenant-settings GET error:', error);
    res.status(500).json({ error: 'Failed to load tenant settings' });
  }
});

router.put('/tenant-settings', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!existing) return res.status(404).json({ error: 'Tenant not found' });

    const name = String(req.body?.name || '').trim();
    const subdomain = String(req.body?.subdomain || '').trim();
    const primaryDomain = String(req.body?.primaryDomain || '').trim() || null;
    const branding = sanitizeBranding(req.body?.branding || {});

    if (!name) return res.status(400).json({ error: 'Tenant name is required' });
    if (!subdomain) return res.status(400).json({ error: 'Subdomain is required' });

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name,
        slug: existing.slug || slugify(subdomain),
        subdomain,
        primaryDomain,
        brandingJson: branding
      }
    });

    res.json(serializeTenantSettings(tenant));
  } catch (error) {
    console.error('Admin tenant-settings PUT error:', error);
    res.status(500).json({ error: 'Failed to save tenant settings' });
  }
});

// REST tenant management endpoints
router.post('/tenant', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const subdomain = String(req.body?.subdomain || '').trim();
    const primaryDomain = String(req.body?.primaryDomain || '').trim() || null;
    const slug = slugify(req.body?.slug || subdomain || name);
    const branding = sanitizeBranding(req.body?.branding || {});

    if (!name || !subdomain) {
      return res.status(400).json({ error: 'Tenant name and subdomain are required' });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        subdomain,
        primaryDomain,
        brandingJson: branding
      }
    });

    res.status(201).json(serializeTenantSettings(tenant));
  } catch (error) {
    console.error('Admin tenant POST error:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

router.get('/tenant/:id', async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(serializeTenantSettings(tenant));
  } catch (error) {
    console.error('Admin tenant by id error:', error);
    res.status(500).json({ error: 'Failed to load tenant' });
  }
});

router.get('/tenant/subdomain/:subdomain', async (req, res) => {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ subdomain: req.params.subdomain }, { slug: req.params.subdomain }] }
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(serializeTenantSettings(tenant));
  } catch (error) {
    console.error('Admin tenant by subdomain error:', error);
    res.status(500).json({ error: 'Failed to load tenant' });
  }
});

router.put('/tenant/:id', async (req, res) => {
  try {
    const existing = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Tenant not found' });

    const name = String(req.body?.name || existing.name || '').trim();
    const subdomain = String(req.body?.subdomain || existing.subdomain || '').trim();
    const primaryDomain = (req.body?.primaryDomain ?? existing.primaryDomain ?? '') || null;
    const branding = sanitizeBranding({ ...(existing.brandingJson || {}), ...(req.body?.branding || {}) });

    if (!name || !subdomain) {
      return res.status(400).json({ error: 'Tenant name and subdomain are required' });
    }

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        name,
        slug: slugify(req.body?.slug || existing.slug || subdomain || name),
        subdomain,
        primaryDomain,
        brandingJson: branding
      }
    });

    res.json(serializeTenantSettings(tenant));
  } catch (error) {
    console.error('Admin tenant PUT error:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

router.get('/', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const dashboard = await buildDashboard(tenantId);
    res.json(dashboard);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to load admin dashboard' });
  }
});

export default router;
