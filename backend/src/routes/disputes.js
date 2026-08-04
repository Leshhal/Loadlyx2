import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db/prisma.js';
import { requireAuth, requirePlatformRole } from '../middleware/requireauth.js';
import { verifyReviewTransaction } from '../services/reputationService.js';

const router = Router();
router.use(requireAuth);

router.post('/', async (req, res, next) => {
  try {
    const input = z.object({
      transactionType: z.enum(['STORE_ORDER', 'MARKETPLACE_LOAD']),
      transactionId: z.string().min(1),
      againstUserId: z.string().optional(),
      reason: z.string().min(3).max(120),
      details: z.string().min(20).max(5000)
    }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    const eligibility = await verifyReviewTransaction(prisma, { transactionType: input.transactionType, transactionId: input.transactionId, user });
    if (!eligibility.verified) return res.status(403).json({ error: 'Only transaction participants may open a dispute' });
    const dispute = await prisma.dispute.create({ data: { ...input, openedByUserId: user.id, tenantId: eligibility.tenantId || user.tenantId } });
    return res.status(201).json(dispute);
  } catch (error) {
    return next(error);
  }
});

router.get('/mine', async (req, res, next) => {
  try {
    const rows = await prisma.dispute.findMany({ where: { openedByUserId: req.user.userId }, orderBy: { createdAt: 'desc' } });
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/all', requirePlatformRole, async (_req, res, next) => {
  try {
    const rows = await prisma.dispute.findMany({ include: { openedByUser: { select: { fullName: true, email: true, role: true } }, againstUser: { select: { fullName: true, email: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 500 });
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

router.put('/admin/:id', requirePlatformRole, async (req, res, next) => {
  try {
    const input = z.object({ status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED']), resolution: z.string().min(3).max(5000) }).parse(req.body);
    const before = await prisma.dispute.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'Dispute not found' });
    const updated = await prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.update({ where: { id: before.id }, data: { ...input, resolvedAt: ['RESOLVED', 'REJECTED', 'CLOSED'].includes(input.status) ? new Date() : null } });
      await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'DISPUTE_STATUS_CHANGED', entityType: 'DISPUTE', entityId: dispute.id, tenantId: dispute.tenantId, beforeJson: before, afterJson: dispute, reason: input.resolution } });
      return dispute;
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

export default router;
