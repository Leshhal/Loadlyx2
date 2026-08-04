import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db/prisma.js';
import { requireAuth, requirePlatformRole } from '../middleware/requireauth.js';
import { buildSimulationEvents, summarizeSimulation } from '../services/simulationService.js';

const router = Router();
router.use(requireAuth, requirePlatformRole);

router.get('/configs', async (_req, res, next) => { try { return res.json(await prisma.simulationConfig.findMany({ include: { tenant: { select: { name: true, slug: true } } }, orderBy: { scopeKey: 'asc' } })); } catch (error) { return next(error); } });

router.put('/configs/:scopeKey', async (req, res, next) => {
  try {
    if (!['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Support access is read-only' });
    const input = z.object({ tenantId: z.string().nullable().optional(), enabled: z.boolean(), intensity: z.enum(['LOW', 'MEDIUM', 'HIGH']), region: z.string().max(120).optional(), watermark: z.string().min(3).max(40).default('DEMO DATA'), businessHours: z.record(z.any()).optional(), reason: z.string().min(3).max(500) }).parse(req.body);
    const scopeKey = req.params.scopeKey === 'GLOBAL' ? 'GLOBAL' : `TENANT:${input.tenantId}`;
    if (scopeKey !== 'GLOBAL' && !input.tenantId) return res.status(400).json({ error: 'Tenant scope requires tenantId' });
    const before = await prisma.simulationConfig.findUnique({ where: { scopeKey } });
    const config = await prisma.$transaction(async (tx) => {
      const saved = await tx.simulationConfig.upsert({ where: { scopeKey }, update: { enabled: input.enabled, intensity: input.intensity, region: input.region, watermark: input.watermark, businessHours: input.businessHours || {} }, create: { scopeKey, tenantId: input.tenantId || null, enabled: input.enabled, intensity: input.intensity, region: input.region, watermark: input.watermark, businessHours: input.businessHours || {} } });
      await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'SIMULATION_CONFIG_CHANGED', entityType: 'SIMULATION_CONFIG', entityId: saved.id, tenantId: saved.tenantId, beforeJson: before, afterJson: saved, reason: input.reason } });
      return saved;
    });
    return res.json(config);
  } catch (error) { return next(error); }
});

router.post('/run/:scopeKey', async (req, res, next) => {
  try {
    if (!['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Support access is read-only' });
    const config = await prisma.simulationConfig.findUnique({ where: { scopeKey: req.params.scopeKey } });
    if (!config?.enabled) return res.status(409).json({ error: 'Simulation is disabled for this scope' });
    const events = buildSimulationEvents({ intensity: config.intensity, tenantId: config.tenantId, region: config.region || 'North America' });
    await prisma.simulationEvent.createMany({ data: events });
    return res.status(201).json({ runId: events[0].runId, watermark: config.watermark, ...summarizeSimulation(events), realCharges: 0, realPayouts: 0, notificationsSent: 0 });
  } catch (error) { return next(error); }
});

router.get('/events', async (req, res, next) => {
  try {
    const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
    const events = await prisma.simulationEvent.findMany({ where: tenantId ? { tenantId } : {}, orderBy: { createdAt: 'desc' }, take: 1000 });
    return res.json({ watermark: 'DEMO DATA', ...summarizeSimulation(events), events });
  } catch (error) { return next(error); }
});

router.delete('/events', async (req, res, next) => {
  try {
    if (!['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Only Platform Admin may reset simulated data' });
    const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
    const result = await prisma.simulationEvent.deleteMany({ where: tenantId ? { tenantId } : {} });
    await prisma.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'SIMULATION_DATA_RESET', entityType: 'SIMULATION_EVENT', entityId: tenantId || 'GLOBAL', tenantId, reason: `Deleted ${result.count} simulated events` } });
    return res.json(result);
  } catch (error) { return next(error); }
});

export default router;
