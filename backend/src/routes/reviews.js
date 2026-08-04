import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db/prisma.js';
import { requireAuth, requirePlatformRole } from '../middleware/requireauth.js';
import { aggregateRatings, verifyReviewTransaction } from '../services/reputationService.js';

const router = Router();
const reviewSchema = z.object({
  targetType: z.enum(['USER', 'TENANT', 'STORE', 'PRODUCT']),
  targetId: z.string().min(1),
  revieweeUserId: z.string().optional(),
  transactionType: z.enum(['STORE_ORDER', 'MARKETPLACE_LOAD']),
  transactionId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(10).max(4000),
  photoUrls: z.array(z.string().url()).max(6).optional()
});

router.get('/target/:targetType/:targetId', async (req, res, next) => {
  try {
    const targetType = z.enum(['USER', 'TENANT', 'STORE', 'PRODUCT']).parse(req.params.targetType.toUpperCase());
    const reviews = await prisma.review.findMany({
      where: { targetType, targetId: req.params.targetId, moderationStatus: 'PUBLISHED' },
      include: { reviewer: { select: { id: true, fullName: true, role: true } }, helpfulVotes: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ summary: aggregateRatings(reviews), reviews: reviews.map((review) => ({ ...review, helpfulCount: review.helpfulVotes.length })) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const input = reviewSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (input.targetType === 'USER' && input.targetId === user.id) return res.status(400).json({ error: 'You cannot review yourself' });
    const eligibility = await verifyReviewTransaction(prisma, { transactionType: input.transactionType, transactionId: input.transactionId, user });
    if (!eligibility.verified) return res.status(403).json({ error: 'Only participants in completed transactions may submit verified reviews' });
    const review = await prisma.review.create({ data: { ...input, reviewerId: user.id, tenantId: eligibility.tenantId || user.tenantId, photoUrls: input.photoUrls || [], verifiedTransaction: true } });
    return res.status(201).json(review);
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/helpful', requireAuth, async (req, res, next) => {
  try {
    const review = await prisma.review.findFirst({ where: { id: req.params.id, moderationStatus: 'PUBLISHED' } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    const vote = await prisma.reviewHelpfulVote.upsert({ where: { reviewId_userId: { reviewId: review.id, userId: req.user.userId } }, update: {}, create: { reviewId: review.id, userId: req.user.userId } });
    return res.status(201).json(vote);
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/report', requireAuth, async (req, res, next) => {
  try {
    const reason = z.string().min(5).max(500).parse(req.body?.reason);
    const report = await prisma.reviewReport.upsert({ where: { reviewId_reporterId: { reviewId: req.params.id, reporterId: req.user.userId } }, update: { reason, status: 'OPEN' }, create: { reviewId: req.params.id, reporterId: req.user.userId, reason } });
    return res.status(201).json(report);
  } catch (error) {
    return next(error);
  }
});

router.put('/:id/respond', requireAuth, async (req, res, next) => {
  try {
    const response = z.string().min(2).max(2000).parse(req.body?.response);
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (!req.user.tenantId || review.tenantId !== req.user.tenantId) return res.status(403).json({ error: 'Forbidden' });
    const updated = await prisma.review.update({ where: { id: review.id }, data: { businessResponse: response, responseAt: new Date() } });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/all', requireAuth, requirePlatformRole, async (req, res, next) => {
  try {
    const rows = await prisma.review.findMany({ include: { reviewer: { select: { fullName: true, email: true, role: true } }, reports: true }, orderBy: { createdAt: 'desc' }, take: 500 });
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

router.put('/admin/:id/moderate', requireAuth, requirePlatformRole, async (req, res, next) => {
  try {
    const status = z.enum(['PUBLISHED', 'HIDDEN', 'LOCKED', 'REMOVED']).parse(req.body?.status);
    const reason = z.string().min(3).max(500).parse(req.body?.reason);
    const before = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Review not found' });
    const updated = await prisma.$transaction(async (tx) => {
      const review = await tx.review.update({ where: { id: before.id }, data: { moderationStatus: status, lockedAt: status === 'LOCKED' ? new Date() : null } });
      await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'REVIEW_MODERATED', entityType: 'REVIEW', entityId: review.id, tenantId: review.tenantId, beforeJson: before, afterJson: review, reason } });
      return review;
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

export default router;
