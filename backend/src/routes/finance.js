import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth, requirePlatformRole } from '../middleware/requireauth.js';
import { SUBSCRIPTION_PLANS, getSubscriptionPlan } from '../config/plans.js';
import { getCommissionPolicy, recordMarketplaceSettlement, recordPayout, recordRefund, recordSubscriptionPayment } from '../services/ledgerService.js';

const router = Router();

function tenantAdminOnly(req, res, next) {
  if (!req.user?.tenantId || !['TENANT_ADMIN', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Tenant administrator access required' });
  }
  return next();
}

function validBps(value) {
  return Number.isInteger(value) && value >= 0 && value <= 10000;
}

function jsonValue(value) {
  return value == null ? undefined : JSON.parse(JSON.stringify(value));
}

async function resolvePlan(code) {
  const normalized = String(code || '').trim().toUpperCase();
  const stored = await prisma.subscriptionPlan.findUnique({ where: { code: normalized } });
  if (stored?.isActive) return { code: stored.code, name: stored.name, monthlyPriceCents: stored.monthlyPriceCents, annualPriceCents: stored.annualPriceCents, currency: stored.currency, commissionBps: stored.storeCommissionBps, features: stored.featuresJson, entitlements: stored.entitlementsJson };
  return getSubscriptionPlan(normalized);
}

router.get('/plans', async (_req, res) => {
  const stored = await prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { monthlyPriceCents: 'asc' } });
  return res.json({ plans: stored.length ? stored.map((plan) => ({ ...plan, features: plan.featuresJson, entitlements: plan.entitlementsJson })) : Object.values(SUBSCRIPTION_PLANS) });
});

router.get('/subscription', requireAuth, async (req, res) => {
  if (!req.user.tenantId) return res.status(403).json({ error: 'Tenant account required' });
  const subscription = await prisma.subscription.findUnique({ where: { tenantId: req.user.tenantId } });
  return res.json({ subscription });
});

router.put('/subscription', requireAuth, tenantAdminOnly, async (req, res) => {
  const plan = await resolvePlan(req.body.planCode);
  if (!plan) return res.status(400).json({ error: 'Invalid subscription plan' });
  const before = await prisma.subscription.findUnique({ where: { tenantId: req.user.tenantId } });
  const subscription = await prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.upsert({
      where: { tenantId: req.user.tenantId },
      update: { planCode: plan.code, monthlyPriceCents: plan.monthlyPriceCents, cancelAtPeriodEnd: false },
      create: { tenantId: req.user.tenantId, planCode: plan.code, monthlyPriceCents: plan.monthlyPriceCents, currency: plan.currency || 'cad', status: 'TRIALING' }
    });
    await tx.tenant.update({ where: { id: req.user.tenantId }, data: { subscriptionPlan: plan.code.toLowerCase() } });
    const configuredPlan = getSubscriptionPlan(plan.code);
    if (configuredPlan) {
      const currentPolicy = await tx.commissionPolicy.findUnique({ where: { tenantId: req.user.tenantId } });
      const managedRates = new Set([300, 550, 650, 700, 800]);
      if (!currentPolicy || (managedRates.has(currentPolicy.storeCommissionBps) && managedRates.has(currentPolicy.marketplaceCommissionBps))) {
        await tx.commissionPolicy.upsert({
          where: { tenantId: req.user.tenantId },
          update: { storeCommissionBps: configuredPlan.commissionBps, marketplaceCommissionBps: configuredPlan.commissionBps },
          create: { scopeKey: `TENANT:${req.user.tenantId}`, tenantId: req.user.tenantId, storeCommissionBps: configuredPlan.commissionBps, marketplaceCommissionBps: configuredPlan.commissionBps }
        });
      }
    }
    await tx.auditEvent.create({ data: {
      actorUserId: req.user.userId, action: before ? 'SUBSCRIPTION_PLAN_CHANGED' : 'SUBSCRIPTION_CREATED',
      entityType: 'SUBSCRIPTION', entityId: updated.id, tenantId: req.user.tenantId,
      beforeJson: jsonValue(before), afterJson: jsonValue(updated)
    } });
    return updated;
  });
  return res.json({ subscription });
});

router.post('/subscription/cancel', requireAuth, tenantAdminOnly, async (req, res) => {
  const before = await prisma.subscription.findUnique({ where: { tenantId: req.user.tenantId } });
  if (!before) return res.status(404).json({ error: 'Subscription not found' });
  const subscription = await prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.update({ where: { tenantId: req.user.tenantId }, data: { cancelAtPeriodEnd: true } });
    await tx.auditEvent.create({ data: {
      actorUserId: req.user.userId, action: 'SUBSCRIPTION_CANCEL_REQUESTED', entityType: 'SUBSCRIPTION',
      entityId: updated.id, tenantId: req.user.tenantId, beforeJson: jsonValue(before), afterJson: jsonValue(updated)
    } });
    return updated;
  });
  return res.json({ subscription });
});

router.get('/admin/policies', requireAuth, requirePlatformRole, async (_req, res) => {
  return res.json({ policies: await prisma.commissionPolicy.findMany({ include: { tenant: { select: { id: true, name: true, slug: true } } }, orderBy: { scopeKey: 'asc' } }) });
});

router.put('/admin/plans/:code', requireAuth, requirePlatformRole, async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!getSubscriptionPlan(code)) return res.status(400).json({ error: 'Plan code must be STARTER, GROWTH, or PROFESSIONAL' });
  const name = String(req.body.name || '').trim();
  const monthlyPriceCents = Number(req.body.monthlyPriceCents);
  const features = Array.isArray(req.body.features) ? req.body.features.map(String).filter(Boolean) : null;
  const annualPriceCents = Number(req.body.annualPriceCents);
  const storeCommissionBps = Number(req.body.storeCommissionBps);
  const marketplaceCommissionBps = Number(req.body.marketplaceCommissionBps);
  const entitlements = req.body.entitlements && typeof req.body.entitlements === 'object' && !Array.isArray(req.body.entitlements) ? req.body.entitlements : null;
  const reason = String(req.body.reason || '').trim();
  if (!name || !Number.isSafeInteger(monthlyPriceCents) || monthlyPriceCents < 0 || !Number.isSafeInteger(annualPriceCents) || annualPriceCents < 0 || !validBps(storeCommissionBps) || !validBps(marketplaceCommissionBps) || !features || !entitlements || !reason) return res.status(400).json({ error: 'Name, pricing, commission rates, features, entitlements, and reason are required' });
  const before = await prisma.subscriptionPlan.findUnique({ where: { code } });
  const plan = await prisma.$transaction(async (tx) => {
    const updated = await tx.subscriptionPlan.upsert({
      where: { code },
      update: { name, monthlyPriceCents, annualPriceCents, storeCommissionBps, marketplaceCommissionBps, featuresJson: features, entitlementsJson: entitlements, displayOrder: Number(req.body.displayOrder || 0), effectiveAt: req.body.effectiveAt ? new Date(req.body.effectiveAt) : new Date(), grandfatherExisting: req.body.grandfatherExisting !== false, isActive: req.body.isActive !== false },
      create: { code, name, monthlyPriceCents, annualPriceCents, storeCommissionBps, marketplaceCommissionBps, featuresJson: features, entitlementsJson: entitlements, displayOrder: Number(req.body.displayOrder || 0), effectiveAt: req.body.effectiveAt ? new Date(req.body.effectiveAt) : new Date(), grandfatherExisting: req.body.grandfatherExisting !== false, isActive: req.body.isActive !== false }
    });
    await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'SUBSCRIPTION_PLAN_CHANGED', entityType: 'SUBSCRIPTION_PLAN', entityId: updated.id, beforeJson: jsonValue(before), afterJson: jsonValue(updated), reason } });
    return updated;
  });
  return res.json({ plan });
});

router.put('/admin/policies/:scopeKey', requireAuth, requirePlatformRole, async (req, res) => {
  const scopeKey = String(req.params.scopeKey || '').trim().toUpperCase();
  const storeCommissionBps = Number(req.body.storeCommissionBps);
  const marketplaceCommissionBps = Number(req.body.marketplaceCommissionBps);
  const minimumMarketplaceFeeCents = Number(req.body.minimumMarketplaceFeeCents || 0);
  const reason = String(req.body.reason || '').trim();
  if (!scopeKey || !reason) return res.status(400).json({ error: 'Scope and change reason are required' });
  if (!validBps(storeCommissionBps) || !validBps(marketplaceCommissionBps) || !Number.isSafeInteger(minimumMarketplaceFeeCents) || minimumMarketplaceFeeCents < 0) {
    return res.status(400).json({ error: 'Invalid commission policy values' });
  }
  const tenantId = scopeKey === 'GLOBAL' ? null : req.body.tenantId;
  if (scopeKey !== 'GLOBAL' && !tenantId) return res.status(400).json({ error: 'Tenant override requires tenantId' });
  const before = await prisma.commissionPolicy.findUnique({ where: { scopeKey } });
  const policy = await prisma.$transaction(async (tx) => {
    const updated = await tx.commissionPolicy.upsert({
      where: { scopeKey },
      update: { storeCommissionBps, marketplaceCommissionBps, minimumMarketplaceFeeCents },
      create: { scopeKey, tenantId, storeCommissionBps, marketplaceCommissionBps, minimumMarketplaceFeeCents }
    });
    await tx.auditEvent.create({ data: {
      actorUserId: req.user.userId, action: 'COMMISSION_POLICY_CHANGED', entityType: 'COMMISSION_POLICY',
      entityId: updated.id, tenantId, beforeJson: jsonValue(before), afterJson: jsonValue(updated), reason
    } });
    return updated;
  });
  return res.json({ policy });
});

router.get('/admin/summary', requireAuth, requirePlatformRole, async (_req, res) => {
  const [byKind, platformCredits, platformDebits, pendingPayouts, subscriptions, recentTransactions, withdrawalRows] = await Promise.all([
    prisma.financialTransaction.groupBy({ by: ['kind', 'status'], _sum: { grossCents: true, platformCommissionCents: true, tenantProceedsCents: true, providerProceedsCents: true, brokerMarginCents: true } }),
    prisma.ledgerEntry.aggregate({ where: { account: 'PLATFORM', direction: 'CREDIT' }, _sum: { amountCents: true } }),
    prisma.ledgerEntry.aggregate({ where: { account: 'PLATFORM', direction: 'DEBIT' }, _sum: { amountCents: true } }),
    prisma.withdrawalRequest.aggregate({ where: { status: { in: ['pending', 'approved'] } }, _sum: { amountCents: true }, _count: true }),
    prisma.subscription.groupBy({ by: ['planCode', 'status'], _count: true, _sum: { monthlyPriceCents: true } }),
    prisma.financialTransaction.findMany({ include: { tenant: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.withdrawalRequest.findMany({ include: { tenant: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: 'desc' }, take: 100 })
  ]);
  return res.json({ platformRevenueCents: (platformCredits._sum.amountCents || 0) - (platformDebits._sum.amountCents || 0), pendingPayouts, byKind, subscriptions, recentTransactions, withdrawals: withdrawalRows });
});

router.post('/admin/marketplace-settlements', requireAuth, requirePlatformRole, async (req, res) => {
  const deal = req.body;
  if (!deal?.id || !Number.isSafeInteger(deal.grossCents) || deal.grossCents <= 0) return res.status(400).json({ error: 'Deal id and positive grossCents are required' });
  const transaction = await prisma.$transaction((tx) => recordMarketplaceSettlement(tx, deal));
  return res.status(201).json({ transaction });
});

router.post('/admin/subscriptions/:id/payments', requireAuth, requirePlatformRole, async (req, res) => {
  const referenceId = String(req.body.referenceId || '').trim();
  if (!referenceId) return res.status(400).json({ error: 'Payment referenceId is required' });
  const subscription = await prisma.subscription.findUnique({ where: { id: req.params.id } });
  if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
  const transaction = await prisma.$transaction((tx) => recordSubscriptionPayment(tx, subscription, referenceId));
  return res.status(201).json({ transaction });
});

router.post('/admin/transactions/:id/refunds', requireAuth, requirePlatformRole, async (req, res) => {
  const amountCents = Number(req.body.amountCents);
  const reason = String(req.body.reason || '').trim();
  const reference = String(req.body.reference || '').trim();
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || !reason || !reference) return res.status(400).json({ error: 'Positive amountCents, reason, and reference are required' });
  const original = await prisma.financialTransaction.findUnique({ where: { id: req.params.id }, include: { ledgerEntries: true } });
  if (!original || !['STORE_SALE', 'MARKETPLACE_DEAL', 'SAAS_SUBSCRIPTION'].includes(original.kind)) return res.status(404).json({ error: 'Refundable transaction not found' });
  const transaction = await prisma.$transaction((tx) => recordRefund(tx, original, amountCents, reason, reference));
  return res.status(201).json({ transaction });
});

router.post('/admin/withdrawals/:id/approve', requireAuth, requirePlatformRole, async (req, res) => {
  const reason = String(req.body.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Approval reason is required' });
  const before = await prisma.withdrawalRequest.findUnique({ where: { id: req.params.id } });
  if (!before || before.status !== 'pending') return res.status(409).json({ error: 'Pending withdrawal not found' });
  const withdrawal = await prisma.$transaction(async (tx) => {
    const updated = await tx.withdrawalRequest.update({ where: { id: before.id }, data: { status: 'approved' } });
    await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'WITHDRAWAL_APPROVED', entityType: 'WITHDRAWAL', entityId: updated.id, tenantId: updated.tenantId, beforeJson: jsonValue(before), afterJson: jsonValue(updated), reason } });
    return updated;
  });
  return res.json({ withdrawal });
});

router.post('/admin/withdrawals/:id/pay', requireAuth, requirePlatformRole, async (req, res) => {
  const paymentReference = String(req.body.paymentReference || '').trim();
  if (!paymentReference) return res.status(400).json({ error: 'Payment reference is required' });
  const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id: req.params.id } });
  if (!withdrawal || withdrawal.status !== 'approved') return res.status(409).json({ error: 'Approved withdrawal not found' });
  const transaction = await prisma.$transaction(async (tx) => {
    const payout = await recordPayout(tx, withdrawal, paymentReference);
    await tx.withdrawalRequest.update({ where: { id: withdrawal.id }, data: { status: 'paid' } });
    await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'WITHDRAWAL_PAID', entityType: 'WITHDRAWAL', entityId: withdrawal.id, tenantId: withdrawal.tenantId, beforeJson: jsonValue(withdrawal), afterJson: { ...jsonValue(withdrawal), status: 'paid' }, reason: paymentReference } });
    return payout;
  });
  return res.json({ transaction });
});

router.get('/policy', requireAuth, async (req, res) => {
  return res.json({ policy: await getCommissionPolicy(prisma, req.user.tenantId || null) });
});

export default router;
