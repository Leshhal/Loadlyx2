import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db/prisma.js';
import { requireAuth, requirePlatformRole } from '../middleware/requireauth.js';
import { mergeThemeSettings, validateThemeManifest } from '../services/themeService.js';

const router = Router();
const keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const packageSchema = z.object({
  key: z.string().regex(keyPattern).max(80),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  compatibilityVersion: z.string().max(20).default('1'),
  previewImageUrl: z.string().url().optional().or(z.literal('')),
  manifest: z.record(z.any())
});

function actorId(req) {
  return req.user.userId || req.user.id;
}

router.get('/', async (req, res, next) => {
  try {
    const themes = await prisma.storeTheme.findMany({
      where: { status: 'APPROVED' },
      orderBy: [{ isBuiltIn: 'desc' }, { name: 'asc' }]
    });
    return res.json(themes);
  } catch (error) {
    return next(error);
  }
});

router.get('/active', requireAuth, async (req, res, next) => {
  try {
    if (!req.user?.tenantId) return res.status(403).json({ error: 'Tenant account required' });
    const activation = await prisma.tenantThemeActivation.findUnique({
      where: { tenantId: req.user.tenantId },
      include: { theme: true, previousTheme: true }
    });
    return res.json(activation);
  } catch (error) {
    return next(error);
  }
});

router.post('/upload', requireAuth, async (req, res, next) => {
  try {
    if (!req.user?.tenantId) return res.status(403).json({ error: 'Tenant account required' });
    const input = packageSchema.parse(req.body);
    const manifest = validateThemeManifest(input.manifest);
    const theme = await prisma.storeTheme.create({
      data: {
        key: input.key,
        name: input.name,
        description: input.description,
        version: input.version,
        compatibilityVersion: input.compatibilityVersion,
        previewImageUrl: input.previewImageUrl || null,
        manifestJson: manifest,
        status: 'PENDING_REVIEW',
        uploadedByTenantId: req.user.tenantId
      }
    });
    await prisma.auditEvent.create({ data: { actorUserId: actorId(req), action: 'THEME_SUBMITTED', entityType: 'STORE_THEME', entityId: theme.id, tenantId: req.user.tenantId, afterJson: theme } });
    return res.status(201).json(theme);
  } catch (error) {
    return next(error);
  }
});

router.put('/:id/status', requireAuth, requirePlatformRole, async (req, res, next) => {
  try {
    const status = z.enum(['APPROVED', 'DISABLED', 'DEPRECATED']).parse(req.body?.status);
    const reason = z.string().min(3).max(500).parse(req.body?.reason);
    const before = await prisma.storeTheme.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Theme not found' });
    const updated = await prisma.$transaction(async (tx) => {
      const theme = await tx.storeTheme.update({ where: { id: before.id }, data: { status } });
      await tx.auditEvent.create({ data: { actorUserId: actorId(req), action: 'THEME_STATUS_CHANGED', entityType: 'STORE_THEME', entityId: theme.id, beforeJson: before, afterJson: theme, reason } });
      return theme;
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/activate', requireAuth, async (req, res, next) => {
  try {
    if (!req.user?.tenantId) return res.status(403).json({ error: 'Tenant account required' });
    const theme = await prisma.storeTheme.findFirst({ where: { id: req.params.id, status: 'APPROVED' } });
    if (!theme) return res.status(404).json({ error: 'Approved theme not found' });
    const settings = mergeThemeSettings(theme.manifestJson, req.body?.settings || {});
    const current = await prisma.tenantThemeActivation.findUnique({ where: { tenantId: req.user.tenantId } });
    const activation = await prisma.$transaction(async (tx) => {
      const saved = await tx.tenantThemeActivation.upsert({
        where: { tenantId: req.user.tenantId },
        update: { previousThemeId: current?.themeId || null, themeId: theme.id, settingsJson: settings, activatedAt: new Date() },
        create: { tenantId: req.user.tenantId, themeId: theme.id, settingsJson: settings }
      });
      await tx.auditEvent.create({ data: { actorUserId: actorId(req), action: 'THEME_ACTIVATED', entityType: 'TENANT_THEME', entityId: saved.id, tenantId: req.user.tenantId, beforeJson: current, afterJson: saved } });
      return saved;
    });
    return res.json(activation);
  } catch (error) {
    return next(error);
  }
});

router.post('/rollback', requireAuth, async (req, res, next) => {
  try {
    if (!req.user?.tenantId) return res.status(403).json({ error: 'Tenant account required' });
    const current = await prisma.tenantThemeActivation.findUnique({ where: { tenantId: req.user.tenantId }, include: { previousTheme: true } });
    if (!current?.previousTheme || current.previousTheme.status !== 'APPROVED') return res.status(409).json({ error: 'No approved previous theme is available' });
    const settings = validateThemeManifest(current.previousTheme.manifestJson);
    const updated = await prisma.tenantThemeActivation.update({
      where: { tenantId: req.user.tenantId },
      data: { themeId: current.previousThemeId, previousThemeId: current.themeId, settingsJson: settings, activatedAt: new Date() }
    });
    await prisma.auditEvent.create({ data: { actorUserId: actorId(req), action: 'THEME_ROLLED_BACK', entityType: 'TENANT_THEME', entityId: updated.id, tenantId: req.user.tenantId, beforeJson: current, afterJson: updated } });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

export default router;
