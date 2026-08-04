import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db/prisma.js';
import { requireAuth, requirePlatformRole } from '../middleware/requireauth.js';
import { AI_MODULES, createAiProvider, requestHash, sanitizeAiInput } from '../services/aiService.js';
import { requireEntitlement } from '../middleware/requireEntitlement.js';

const router = Router();
router.use(requireAuth);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1);

router.post('/assist', requireEntitlement('ai'), async (req, res, next) => {
  const userId = req.user.userId;
  const tenantId = req.user.tenantId || null;
  let provider;
  let module;
  let input;
  try {
    module = z.string().transform((value) => value.toUpperCase()).refine((value) => AI_MODULES.has(value), 'Unsupported AI module').parse(req.body?.module);
    input = sanitizeAiInput(req.body?.input);
    const globalFlag = await prisma.featureFlag.findUnique({ where: { key: 'ai-assistant' } });
    if (!globalFlag?.enabled) return res.status(403).json({ error: 'AI is disabled globally' });
    const config = tenantId ? await prisma.aiTenantConfig.findUnique({ where: { tenantId } }) : null;
    if (tenantId && (!config?.enabled || !(config.allowedModules || []).includes(module))) return res.status(403).json({ error: 'AI module is disabled for this tenant' });
    if (!tenantId && !['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT', 'MARKETPLACE_USER'].includes(req.user.role)) return res.status(403).json({ error: 'AI access is unavailable' });
    if (tenantId) {
      const used = await prisma.aiUsageEvent.count({ where: { tenantId, createdAt: { gte: startOfMonth() }, status: 'SUCCESS' } });
      if (used >= config.monthlyRequestLimit) return res.status(429).json({ error: 'Monthly AI request limit reached' });
    }
    const templateKey = String(req.body?.templateKey || `${module.toLowerCase()}-assistant`);
    const template = await prisma.aiPromptTemplate.findFirst({ where: { key: templateKey, module, enabled: true } });
    if (!template) return res.status(400).json({ error: 'Approved AI prompt template not found' });
    provider = createAiProvider();
    const result = await provider.generate({ module, instructions: template.systemPrompt, input });
    await prisma.aiUsageEvent.create({ data: { tenantId, userId, module, provider: provider.name, model: provider.model, inputTokens: result.inputTokens || 0, outputTokens: result.outputTokens || 0, status: 'SUCCESS', requestHash: requestHash({ tenantId, userId, module, input }) } });
    return res.json({ text: result.text, module, provider: provider.name, model: provider.model, usage: { inputTokens: result.inputTokens || 0, outputTokens: result.outputTokens || 0 } });
  } catch (error) {
    if (module && input) await prisma.aiUsageEvent.create({ data: { tenantId, userId, module, provider: provider?.name || process.env.AI_PROVIDER || 'DISABLED', model: provider?.model || process.env.AI_MODEL || 'none', status: 'FAILED', errorCode: error.name || 'AI_ERROR', requestHash: requestHash({ tenantId, userId, module, input }) } }).catch(() => {});
    return next(error);
  }
});

router.get('/admin/configs', requirePlatformRole, async (_req, res, next) => { try { return res.json(await prisma.aiTenantConfig.findMany({ include: { tenant: { select: { name: true, slug: true } } } })); } catch (error) { return next(error); } });
router.put('/admin/configs/:tenantId', requirePlatformRole, async (req, res, next) => {
  try {
    if (!['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Support access is read-only' });
    const input = z.object({ enabled: z.boolean(), monthlyRequestLimit: z.number().int().min(0).max(100000), allowedModules: z.array(z.string()).max(20), reason: z.string().min(3).max(500) }).parse(req.body);
    const modules = [...new Set(input.allowedModules.map((value) => value.toUpperCase()).filter((value) => AI_MODULES.has(value)))];
    const before = await prisma.aiTenantConfig.findUnique({ where: { tenantId: req.params.tenantId } });
    const saved = await prisma.$transaction(async (tx) => {
      const config = await tx.aiTenantConfig.upsert({ where: { tenantId: req.params.tenantId }, update: { enabled: input.enabled, monthlyRequestLimit: input.monthlyRequestLimit, allowedModules: modules }, create: { tenantId: req.params.tenantId, enabled: input.enabled, monthlyRequestLimit: input.monthlyRequestLimit, allowedModules: modules } });
      await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'AI_TENANT_CONFIG_CHANGED', entityType: 'AI_TENANT_CONFIG', entityId: config.id, tenantId: config.tenantId, beforeJson: before, afterJson: config, reason: input.reason } });
      return config;
    });
    return res.json(saved);
  } catch (error) { return next(error); }
});
router.get('/admin/usage', requirePlatformRole, async (_req, res, next) => { try { const rows = await prisma.aiUsageEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 }); const totals = await prisma.aiUsageEvent.aggregate({ _sum: { inputTokens: true, outputTokens: true, estimatedCostMicros: true }, _count: true }); return res.json({ totals, rows }); } catch (error) { return next(error); } });

export default router;
