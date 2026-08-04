import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth, requirePlatformRole } from '../middleware/requireauth.js';

const router = Router();
const sectionSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/).max(80),
  enabled: z.boolean().default(true),
  displayOrder: z.number().int().min(0).max(1000),
  eyebrow: z.string().max(160).optional().default(''),
  headline: z.string().max(300).optional().default(''),
  supportingText: z.string().max(3000).optional().default(''),
  ctaLabel: z.string().max(120).optional().default(''),
  ctaUrl: z.string().max(500).optional().default(''),
  secondaryCtaLabel: z.string().max(120).optional().default(''),
  secondaryCtaUrl: z.string().max(500).optional().default(''),
  imageUrl: z.string().max(1000).optional().default(''),
  visualVariant: z.string().max(80).optional().default('default'),
  items: z.array(z.record(z.any())).max(100).optional().default([])
});
const homepageSchema = z.object({ sections: z.array(sectionSchema).min(1).max(30) });
const socialSchema = z.object({ platform: z.enum(['TWITTER', 'X', 'INSTAGRAM', 'TIKTOK', 'FACEBOOK']), displayLabel: z.string().min(1).max(80), url: z.string().url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)), enabled: z.boolean().default(true), displayOrder: z.number().int().min(0).max(1000), icon: z.string().max(80).optional(), openNewTab: z.boolean().default(true) });

function safeUrl(value) {
  if (!value) return '';
  if (value.startsWith('/') || value.startsWith('#')) return value;
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only relative, HTTP, and HTTPS URLs are permitted');
  return parsed.toString();
}

function sanitizeText(value) {
  return String(value || '').replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=\s*(["']).*?\1/gi, '').trim();
}

function sanitizeHomepage(input) {
  const parsed = homepageSchema.parse(input);
  return { sections: parsed.sections.map((section) => ({ ...section, eyebrow: sanitizeText(section.eyebrow), headline: sanitizeText(section.headline), supportingText: sanitizeText(section.supportingText), ctaLabel: sanitizeText(section.ctaLabel), ctaUrl: safeUrl(section.ctaUrl), secondaryCtaLabel: sanitizeText(section.secondaryCtaLabel), secondaryCtaUrl: safeUrl(section.secondaryCtaUrl), imageUrl: section.imageUrl ? safeUrl(section.imageUrl) : '', items: section.items.map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, typeof value === 'string' ? sanitizeText(value) : value]))) })) };
}

router.get('/public', async (_req, res, next) => {
  try {
    const [homepage, socialLinks] = await Promise.all([
      prisma.websiteContentVersion.findFirst({ where: { contentKey: 'homepage', status: 'PUBLISHED' }, orderBy: { version: 'desc' } }),
      prisma.websiteSocialLink.findMany({ where: { enabled: true }, orderBy: [{ displayOrder: 'asc' }, { platform: 'asc' }] })
    ]);
    return res.json({ homepage: homepage?.contentJson || null, homepageVersion: homepage?.version || null, socialLinks });
  } catch (error) { return next(error); }
});

router.use(requireAuth, requirePlatformRole);
router.get('/homepage', async (_req, res, next) => {
  try { return res.json(await prisma.websiteContentVersion.findMany({ where: { contentKey: 'homepage' }, orderBy: { version: 'desc' }, take: 30 })); } catch (error) { return next(error); }
});
router.post('/homepage/drafts', async (req, res, next) => {
  try {
    if (!['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Read-only platform role' });
    const contentJson = sanitizeHomepage(req.body);
    const latest = await prisma.websiteContentVersion.findFirst({ where: { contentKey: 'homepage' }, orderBy: { version: 'desc' } });
    const saved = await prisma.$transaction(async (tx) => {
      const draft = await tx.websiteContentVersion.create({ data: { contentKey: 'homepage', version: (latest?.version || 0) + 1, contentJson, updatedById: req.user.userId } });
      await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'HOMEPAGE_DRAFT_CREATED', entityType: 'WEBSITE_CONTENT', entityId: draft.id, afterJson: draft } });
      return draft;
    });
    return res.status(201).json(saved);
  } catch (error) { return next(error); }
});
router.post('/homepage/:id/publish', async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Only Super Admin may publish global website content' });
    const reason = z.string().min(3).max(500).parse(req.body?.reason);
    const draft = await prisma.websiteContentVersion.findUnique({ where: { id: req.params.id } });
    if (!draft || draft.contentKey !== 'homepage') return res.status(404).json({ error: 'Homepage draft not found' });
    const published = await prisma.$transaction(async (tx) => {
      await tx.websiteContentVersion.updateMany({ where: { contentKey: 'homepage', status: 'PUBLISHED' }, data: { status: 'ARCHIVED' } });
      const row = await tx.websiteContentVersion.update({ where: { id: draft.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'HOMEPAGE_PUBLISHED', entityType: 'WEBSITE_CONTENT', entityId: row.id, afterJson: row, reason } });
      return row;
    });
    return res.json(published);
  } catch (error) { return next(error); }
});
router.post('/homepage/:id/rollback', async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Only Super Admin may roll back global website content' });
    const reason = z.string().min(3).max(500).parse(req.body?.reason);
    const source = await prisma.websiteContentVersion.findUnique({ where: { id: req.params.id } });
    if (!source || source.contentKey !== 'homepage') return res.status(404).json({ error: 'Homepage version not found' });
    const latest = await prisma.websiteContentVersion.findFirst({ where: { contentKey: 'homepage' }, orderBy: { version: 'desc' } });
    const row = await prisma.$transaction(async (tx) => {
      await tx.websiteContentVersion.updateMany({ where: { contentKey: 'homepage', status: 'PUBLISHED' }, data: { status: 'ARCHIVED' } });
      const created = await tx.websiteContentVersion.create({ data: { contentKey: 'homepage', version: (latest?.version || 0) + 1, status: 'PUBLISHED', contentJson: source.contentJson, updatedById: req.user.userId, publishedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'HOMEPAGE_ROLLED_BACK', entityType: 'WEBSITE_CONTENT', entityId: created.id, afterJson: { sourceVersion: source.version, newVersion: created.version }, reason } });
      return created;
    });
    return res.json(row);
  } catch (error) { return next(error); }
});

router.get('/social-links', async (_req, res, next) => { try { return res.json(await prisma.websiteSocialLink.findMany({ orderBy: [{ displayOrder: 'asc' }, { platform: 'asc' }] })); } catch (error) { return next(error); } });
router.post('/social-links', async (req, res, next) => {
  try { const input = socialSchema.parse(req.body); const row = await prisma.websiteSocialLink.create({ data: { ...input, updatedById: req.user.userId } }); await prisma.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'SOCIAL_LINK_CREATED', entityType: 'WEBSITE_SOCIAL_LINK', entityId: row.id, afterJson: row } }); return res.status(201).json(row); } catch (error) { return next(error); }
});
router.put('/social-links/:id', async (req, res, next) => {
  try { const input = socialSchema.parse(req.body); const before = await prisma.websiteSocialLink.findUnique({ where: { id: req.params.id } }); if (!before) return res.status(404).json({ error: 'Social link not found' }); const row = await prisma.websiteSocialLink.update({ where: { id: before.id }, data: { ...input, updatedById: req.user.userId } }); await prisma.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'SOCIAL_LINK_UPDATED', entityType: 'WEBSITE_SOCIAL_LINK', entityId: row.id, beforeJson: before, afterJson: row } }); return res.json(row); } catch (error) { return next(error); }
});
router.delete('/social-links/:id', async (req, res, next) => {
  try { const before = await prisma.websiteSocialLink.findUnique({ where: { id: req.params.id } }); if (!before) return res.status(404).json({ error: 'Social link not found' }); await prisma.websiteSocialLink.delete({ where: { id: before.id } }); await prisma.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'SOCIAL_LINK_DELETED', entityType: 'WEBSITE_SOCIAL_LINK', entityId: before.id, beforeJson: before } }); return res.status(204).end(); } catch (error) { return next(error); }
});

export default router;
