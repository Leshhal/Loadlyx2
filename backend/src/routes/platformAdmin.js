import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db/prisma.js';
import { requireAuth, requirePlatformRole } from '../middleware/requireauth.js';

const router = Router();
router.use(requireAuth, requirePlatformRole);

const WRITE_ROLES = new Set(['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN']);
function requireWrite(req, res, next) {
  if (!WRITE_ROLES.has(req.user.role)) return res.status(403).json({ error: 'Support access is read-only' });
  next();
}

router.get('/summary', async (_req, res, next) => {
  try {
    const [users, activeUsers, tenants, activeTenants, loads, orders, openDisputes, openTickets, revenue] = await Promise.all([
      prisma.user.count(), prisma.user.count({ where: { isActive: true } }), prisma.tenant.count(), prisma.tenant.count({ where: { isActive: true } }),
      prisma.load.count(), prisma.order.count(), prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
      prisma.supportTicket.count({ where: { status: { not: 'CLOSED' } } }),
      prisma.ledgerEntry.aggregate({ where: { account: 'PLATFORM', direction: 'CREDIT', transaction: { status: { in: ['AVAILABLE', 'SETTLED'] } } }, _sum: { amountCents: true } })
    ]);
    return res.json({ users, activeUsers, tenants, activeTenants, loads, orders, openDisputes, openTickets, platformRevenueCents: revenue._sum.amountCents || 0 });
  } catch (error) { return next(error); }
});

router.get('/users', async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim();
    const users = await prisma.user.findMany({ where: query ? { OR: [{ email: { contains: query, mode: 'insensitive' } }, { fullName: { contains: query, mode: 'insensitive' } }] } : {}, include: { tenant: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: 'desc' }, take: 500 });
    return res.json(users.map(({ passwordHash, ...user }) => user));
  } catch (error) { return next(error); }
});

router.get('/marketplace-providers', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ['BROKER', 'CARRIER'] } },
      include: { tenant: { select: { id: true, name: true, slug: true, carrierProfiles: true } } },
      orderBy: { createdAt: 'desc' }, take: 1000
    });
    const userIds = users.map((user) => user.id);
    const [reviews, trustScores] = await Promise.all([
      prisma.review.groupBy({ where: { revieweeUserId: { in: userIds }, moderationStatus: 'PUBLISHED' }, by: ['revieweeUserId'], _avg: { rating: true }, _count: { rating: true } }),
      prisma.marketplaceTrustScore.findMany({ where: { userId: { in: userIds } }, orderBy: [{ userId: 'asc' }, { version: 'desc' }] })
    ]);
    const reviewMap = new Map(reviews.map((row) => [row.revieweeUserId, { rating: row._avg.rating || 0, reviewCount: row._count.rating }]));
    const trustMap = new Map();
    trustScores.forEach((row) => { if (!trustMap.has(row.userId)) trustMap.set(row.userId, row); });
    return res.json(users.map(({ passwordHash, ...user }) => ({ ...user, ...reviewMap.get(user.id), trust: trustMap.get(user.id) || null, carrierProfile: user.tenant?.carrierProfiles?.[0] || null })));
  } catch (error) { return next(error); }
});

router.put('/users/:id', requireWrite, async (req, res, next) => {
  try {
    const input = z.object({ isActive: z.boolean().optional(), role: z.enum(['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT', 'TENANT_ADMIN', 'TENANT_STAFF', 'MARKETPLACE_USER', 'BROKER', 'CARRIER', 'STAFF']).optional(), reason: z.string().min(3).max(500) }).parse(req.body);
    const before = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'User not found' });
    if (before.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Only Super Admin may modify a Super Admin' });
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id: before.id }, data: { ...(input.isActive !== undefined ? { isActive: input.isActive } : {}), ...(input.role ? { role: input.role } : {}) } });
      if (input.isActive === false) await tx.authToken.updateMany({ where: { userId: user.id, type: 'REFRESH_TOKEN', consumedAt: null }, data: { consumedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'USER_ADMIN_CHANGED', entityType: 'USER', entityId: user.id, tenantId: user.tenantId, beforeJson: before, afterJson: user, reason: input.reason } });
      return user;
    });
    const { passwordHash, ...safeUser } = updated;
    return res.json(safeUser);
  } catch (error) { return next(error); }
});

router.post('/users/:id/force-logout', requireWrite, async (req, res, next) => {
  try {
    const reason = z.string().min(3).max(500).parse(req.body?.reason);
    await prisma.$transaction(async (tx) => {
      await tx.authToken.updateMany({ where: { userId: req.params.id, type: 'REFRESH_TOKEN', consumedAt: null }, data: { consumedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'USER_FORCE_LOGOUT', entityType: 'USER', entityId: req.params.id, reason } });
    });
    return res.status(204).end();
  } catch (error) { return next(error); }
});

router.get('/tenants', async (_req, res, next) => {
  try {
    return res.json(await prisma.tenant.findMany({ include: { _count: { select: { users: true, products: true, orders: true, loads: true } }, subscription: true }, orderBy: { createdAt: 'desc' }, take: 500 }));
  } catch (error) { return next(error); }
});

router.put('/tenants/:id/status', requireWrite, async (req, res, next) => {
  try {
    const input = z.object({ isActive: z.boolean(), reason: z.string().min(3).max(500) }).parse(req.body);
    const before = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Tenant not found' });
    const updated = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({ where: { id: before.id }, data: { isActive: input.isActive } });
      await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'TENANT_STATUS_CHANGED', entityType: 'TENANT', entityId: tenant.id, tenantId: tenant.id, beforeJson: before, afterJson: tenant, reason: input.reason } });
      return tenant;
    });
    return res.json(updated);
  } catch (error) { return next(error); }
});

router.get('/feature-flags', async (_req, res, next) => { try { return res.json(await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } })); } catch (error) { return next(error); } });
router.put('/feature-flags/:key', requireWrite, async (req, res, next) => {
  try {
    const input = z.object({ enabled: z.boolean(), tenantIds: z.array(z.string()).max(500).optional(), reason: z.string().min(3).max(500), confirmed: z.literal(true) }).parse(req.body);
    const before = await prisma.featureFlag.findUnique({ where: { key: req.params.key } });
    if (!before) return res.status(404).json({ error: 'Feature flag not found' });
    const updated = await prisma.$transaction(async (tx) => {
      const flag = await tx.featureFlag.update({ where: { key: before.key }, data: { enabled: input.enabled, tenantIds: input.tenantIds || [] } });
      await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'FEATURE_FLAG_CHANGED', entityType: 'FEATURE_FLAG', entityId: flag.id, beforeJson: before, afterJson: flag, reason: input.reason } });
      return flag;
    });
    return res.json(updated);
  } catch (error) { return next(error); }
});

router.get('/audit-events', async (req, res, next) => { try { return res.json(await prisma.auditEvent.findMany({ where: req.query.entityType ? { entityType: String(req.query.entityType) } : {}, orderBy: { createdAt: 'desc' }, take: 500 })); } catch (error) { return next(error); } });
router.get('/support-tickets', async (_req, res, next) => { try { return res.json(await prisma.supportTicket.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })); } catch (error) { return next(error); } });
router.put('/support-tickets/:id', async (req, res, next) => {
  try {
    const input = z.object({ status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']), assignedTo: z.string().max(120).optional(), resolution: z.string().max(5000).optional() }).parse(req.body);
    return res.json(await prisma.supportTicket.update({ where: { id: req.params.id }, data: input }));
  } catch (error) { return next(error); }
});

router.get('/health', async (_req, res) => {
  let database = 'unavailable';
  try { await prisma.$queryRaw`SELECT 1`; database = 'available'; } catch {}
  return res.json({ api: 'available', database, stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY), emailConfigured: Boolean(process.env.SMTP_HOST), mediaProvider: process.env.MEDIA_STORAGE_PROVIDER || 'LOCAL', timestamp: new Date().toISOString() });
});

export default router;
