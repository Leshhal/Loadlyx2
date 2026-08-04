import { Router } from 'express';

import { prisma } from '../db/prisma.js';
import { requireAuth, requirePlatformRole } from '../middleware/requireauth.js';
import { approximateConnection, hashConnectionValue, mapPosition } from '../services/locationPrivacy.js';
import { z } from 'zod';

const router = Router();

router.post('/heartbeat', requireAuth, async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || req.user.userId;
    const location = approximateConnection(req);
    const sessionHash = hashConnectionValue(authorization);
    const event = await prisma.connectionEvent.upsert({
      where: { userId_sessionHash: { userId: req.user.userId, sessionHash } },
      update: { ...location, tenantId: req.user.tenantId || null, deviceType: req.body?.deviceType || null, operatingSystem: req.body?.operatingSystem || null, browser: req.body?.browser || null, sessionStatus: 'ACTIVE', successful: true, lastSeenAt: new Date() },
      create: { userId: req.user.userId, tenantId: req.user.tenantId || null, sessionHash, ...location, deviceType: req.body?.deviceType || null, operatingSystem: req.body?.operatingSystem || null, browser: req.body?.browser || null }
    });
    return res.json({ lastSeenAt: event.lastSeenAt, approximateLocationRecorded: Boolean(event.city || event.country) });
  } catch (error) { return next(error); }
});

router.get('/admin', requireAuth, requirePlatformRole, async (req, res, next) => {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const detailed = req.query.detail === 'true';
    if (detailed && !['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Detailed connection access requires Platform Admin' });
    const [connections, loads, tenants] = await Promise.all([
      prisma.connectionEvent.findMany({ where: { lastSeenAt: { gte: cutoff } }, include: { user: { select: { id: true, fullName: true, email: true, role: true, lastLoginAt: true, createdAt: true } }, tenant: { select: { id: true, name: true, slug: true, subscriptionPlan: true } } }, orderBy: { lastSeenAt: 'desc' }, take: 1000 }),
      prisma.load.findMany({ where: { status: { in: ['PENDING', 'POSTED', 'BOOKED'] } }, select: { id: true, status: true, originCity: true, originProvince: true, originCountry: true, destinationCity: true, destinationProvince: true, destinationCountry: true, pickupDate: true, tenantId: true }, take: 500 }),
      prisma.tenant.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true, primaryDomain: true, subscriptionPlan: true }, take: 500 })
    ]);
    if (detailed) await prisma.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'DETAILED_CONNECTION_MAP_ACCESSED', entityType: 'OPERATIONS_MAP', entityId: 'active-connections', reason: 'Authorized operations-map detail request' } });
    return res.json({
      privacy: { precision: 'approximately 1 km where edge coordinates are available', rawIpStored: false, activeWindowMinutes: 30, retentionDays: Number(process.env.CONNECTION_RETENTION_DAYS || 30) },
      connections: connections.map((event) => ({ id: event.id, user: event.user, tenant: event.tenant, city: event.city, region: event.region, country: event.country, latitude: event.latitude, longitude: event.longitude, position: mapPosition(event.latitude, event.longitude), lastSeenAt: event.lastSeenAt, deviceType: event.deviceType, operatingSystem: event.operatingSystem, browser: event.browser, sessionStatus: event.sessionStatus, successful: event.successful, riskLevel: event.riskLevel, ...(detailed ? { connectionFingerprint: event.ipHash.slice(0, 12) } : {}) })),
      loads,
      tenants
    });
  } catch (error) { return next(error); }
});

router.get('/security/blocks', requireAuth, requirePlatformRole, async (req, res, next) => { try { if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Super Admin required' }); return res.json(await prisma.securityBlock.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } })); } catch (error) { return next(error); } });

router.post('/security/blocks', requireAuth, requirePlatformRole, async (req, res, next) => { try {
  if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Super Admin required' });
  const input = z.object({ targetType: z.enum(['USER','IP','SESSION','DEVICE']), targetValue: z.string().min(2), userId: z.string().optional(), sessionHash: z.string().optional(), tenantId: z.string().optional(), reason: z.string().min(8), expiresAt: z.coerce.date().optional(), warningAccepted: z.boolean().default(false) }).parse(req.body);
  if (input.targetType === 'IP' && !input.warningAccepted) return res.status(400).json({ error: 'Confirm that IP addresses may be shared by VPN, mobile, and business networks' });
  const targetValueHash = hashConnectionValue(input.targetValue);
  const block = await prisma.securityBlock.create({ data: { targetType: input.targetType, targetValueHash, targetDisplay: input.targetType === 'IP' ? `${input.targetValue.split('.').slice(0,2).join('.')}.*.*` : input.targetValue.slice(0, 24), userId: input.userId || null, sessionHash: input.sessionHash || null, tenantId: input.tenantId || null, reason: input.reason, expiresAt: input.expiresAt || null, warningAccepted: input.warningAccepted, createdById: req.user.userId } });
  if (input.targetType === 'USER' && input.userId) { const target = await prisma.user.findUnique({ where: { id: input.userId } }); if (target?.role === 'SUPER_ADMIN') return res.status(400).json({ error: 'Emergency Super Admin accounts cannot be suspended through this control' }); await prisma.user.update({ where: { id: input.userId }, data: { isActive: false } }); }
  await prisma.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'SECURITY_BLOCK_CREATED', entityType: 'SECURITY_BLOCK', entityId: block.id, tenantId: input.tenantId || null, reason: input.reason, afterJson: { targetType: input.targetType, expiresAt: input.expiresAt || null } } });
  return res.status(201).json(block);
} catch (error) { return next(error); } });

router.delete('/security/blocks/:id', requireAuth, requirePlatformRole, async (req, res, next) => { try { if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Super Admin required' }); const block = await prisma.securityBlock.update({ where: { id: req.params.id }, data: { active: false, revokedAt: new Date() } }); await prisma.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'SECURITY_BLOCK_REVOKED', entityType: 'SECURITY_BLOCK', entityId: block.id, reason: String(req.body?.reason || 'Revoked by Super Admin') } }); return res.json(block); } catch (error) { return next(error); } });

router.delete('/retention', requireAuth, requirePlatformRole, async (req, res, next) => {
  try {
    if (!['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    const days = Math.max(1, Number(process.env.CONNECTION_RETENTION_DAYS || 30));
    const result = await prisma.connectionEvent.deleteMany({ where: { lastSeenAt: { lt: new Date(Date.now() - days * 86400000) } } });
    await prisma.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'CONNECTION_RETENTION_APPLIED', entityType: 'OPERATIONS_MAP', entityId: 'connection-events', reason: `Deleted ${result.count} events older than ${days} days` } });
    return res.json(result);
  } catch (error) { return next(error); }
});

export default router;
