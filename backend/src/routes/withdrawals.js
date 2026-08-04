import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { getTenantBalance } from '../services/balanceService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Tenant account required' });
    return res.json(await prisma.withdrawalRequest.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }));
  } catch (error) {
    console.error('Withdrawal list error:', error);
    return res.status(500).json({ error: 'Failed to load withdrawals' });
  }
});

router.post('/request', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Tenant account required' });
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { brandingJson: true } });
    const paymentSettings = tenant?.brandingJson?.paymentSettings || {};
    if (!paymentSettings.payoutMethod) return res.status(409).json({ error: 'Configure a payout destination before requesting a withdrawal' });
    if (paymentSettings.payoutMethod === 'STRIPE' && !paymentSettings.stripeAccountId) return res.status(409).json({ error: 'Complete Stripe onboarding before requesting a withdrawal' });
    if (paymentSettings.payoutMethod === 'PAYPAL' && !paymentSettings.paypalMerchantId) return res.status(409).json({ error: 'Add a PayPal merchant ID before requesting a withdrawal' });
    const idempotencyKey = String(req.headers['idempotency-key'] || req.body?.idempotencyKey || '').trim();
    if (idempotencyKey.length < 8 || idempotencyKey.length > 200) return res.status(400).json({ error: 'A valid idempotency key is required' });
    const existing = await prisma.withdrawalRequest.findUnique({ where: { idempotencyKey } });
    if (existing) return existing.tenantId === tenantId ? res.json(existing) : res.status(409).json({ error: 'Idempotency key conflict' });
    const amountCents = Number(req.body.amountCents);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const balance = await getTenantBalance(prisma, tenantId);
    if (amountCents > balance.availableCents) return res.status(409).json({ error: 'Insufficient available balance', availableCents: balance.availableCents });
    const destinationRef = paymentSettings.payoutMethod === 'STRIPE' ? paymentSettings.stripeAccountId : paymentSettings.paypalMerchantId;
    const withdrawal = await prisma.$transaction(async (tx) => {
      const row = await tx.withdrawalRequest.create({ data: { idempotencyKey, tenantId, requestedByUserId: req.user.userId, amountCents, currency: String(req.body.currency || 'cad').toLowerCase(), payoutMethod: paymentSettings.payoutMethod, destinationRef, status: 'PENDING' } });
      await tx.auditEvent.create({ data: { actorUserId: req.user.userId, tenantId, action: 'WITHDRAWAL_REQUESTED', entityType: 'WITHDRAWAL_REQUEST', entityId: row.id, afterJson: { amountCents, currency: row.currency, payoutMethod: row.payoutMethod } } });
      return row;
    });
    return res.status(201).json(withdrawal);
  } catch (error) {
    console.error('Withdrawal request error:', error);
    return res.status(500).json({ error: 'Failed to request withdrawal' });
  }
});

export default router;
