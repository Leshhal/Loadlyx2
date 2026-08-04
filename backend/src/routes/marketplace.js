import { Router } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { optionalAuth, requireAuth } from '../middleware/requireauth.js';
import { assertMarketplaceTransition, canAccessLoadConversation, canBid, canManageLoad, canPostLoad } from '../services/marketplaceWorkflow.js';
import { presentMarketplaceLoads } from '../services/marketplacePresentation.js';
import { calculateMarketplaceSplit, feeRuleSnapshot, payoutIsEligible, resolveMarketplaceFee } from '../services/marketplaceFinance.js';
import { calculateTrustScore } from '../services/marketplaceTrust.js';
import { env } from '../config/env.js';

const router = Router();
const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;
const includeLoad = { poster: { select: { id: true, fullName: true, role: true } }, broker: { select: { id: true, fullName: true, role: true } }, carrier: { select: { id: true, fullName: true, role: true } }, bids: { include: { bidder: { select: { id: true, fullName: true, role: true } }, history: { orderBy: { createdAt: 'asc' } } }, orderBy: { amountCents: 'asc' } } };
const loadSchema = z.object({ title: z.string().min(4).max(160), description: z.string().min(20).max(5000), category: z.string().max(120).optional(), originCity: z.string().min(2).max(120), originRegion: z.string().max(120).optional(), originCountry: z.string().length(2), destinationCity: z.string().min(2).max(120), destinationRegion: z.string().max(120).optional(), destinationCountry: z.string().length(2), pickupDate: z.coerce.date(), deliveryDate: z.coerce.date().optional(), equipmentType: z.string().max(120).optional(), weightKg: z.number().positive().optional(), volumeCubicM: z.number().positive().optional(), dimensionsJson: z.record(z.any()).optional(), specialHandling: z.string().max(1000).optional(), imageUrls: z.array(z.string().url()).max(12).optional(), documentUrls: z.array(z.string().url()).max(12).optional(), currency: z.string().length(3).default('cad'), visibility: z.enum(['PUBLIC','PRIVATE','INVITE_ONLY']).default('PUBLIC'), expiresAt: z.coerce.date().optional(), budgetCents: z.number().int().positive().optional(), postedForCustomer: z.boolean().default(false), customerName: z.string().max(200).optional(), customerEmail: z.string().email().optional() });
const offerSchema = z.object({ amountCents: z.number().int().positive(), currency: z.string().length(3).default('cad'), message: z.string().max(2000).optional(), transitDays: z.number().int().positive().max(365).optional(), pickupAvailability: z.string().max(300).optional(), estimatedDelivery: z.coerce.date().optional(), equipment: z.string().max(300).optional(), conditions: z.string().max(3000).optional(), expiresAt: z.coerce.date().optional() });

function offerSnapshot(offer) { return { amountCents: offer.amountCents, currency: offer.currency, message: offer.message, transitDays: offer.transitDays, pickupAvailability: offer.pickupAvailability, estimatedDelivery: offer.estimatedDelivery, equipment: offer.equipment, conditions: offer.conditions, expiresAt: offer.expiresAt, version: offer.version, status: offer.status }; }

router.get('/loads', optionalAuth, async (req, res, next) => {
  try {
    const [loads, globalSimulation] = await Promise.all([
      prisma.marketplaceLoad.findMany({ where: { status: { in: ['POSTED','BIDDING'] } }, include: includeLoad, orderBy: { pickupDate: 'asc' }, take: 200 }),
      prisma.simulationConfig.findUnique({ where: { scopeKey: 'GLOBAL' } })
    ]);
    const simulationEvents = globalSimulation?.enabled
      ? await prisma.simulationEvent.findMany({ where: { kind: 'LOAD_POSTED', isSimulated: true }, orderBy: { createdAt: 'desc' }, take: 40 })
      : [];
    return res.json(presentMarketplaceLoads({ loads, simulationEvents, authenticated: Boolean(req.user) }));
  } catch (error) { return next(error); }
});
router.use(requireAuth);
router.get('/loads/mine', async (req, res, next) => { try { return res.json(await prisma.marketplaceLoad.findMany({ where: { OR: [{ posterId: req.user.userId }, { brokerId: req.user.userId }, { carrierId: req.user.userId }, { bids: { some: { bidderId: req.user.userId } } }] }, include: includeLoad, orderBy: { createdAt: 'desc' } })); } catch (error) { return next(error); } });
router.get('/loads/:id', async (req, res, next) => {
  try {
    const load = await prisma.marketplaceLoad.findUnique({ where: { id: req.params.id }, include: includeLoad });
    if (!load) return res.status(404).json({ error: 'Load not found' });
    const involved = canManageLoad(req.user, load) || load.carrierId === req.user.userId || load.bids.some((bid) => bid.bidderId === req.user.userId) || ['SUPER_ADMIN','PLATFORM_ADMIN','ADMIN','SUPPORT'].includes(req.user.role);
    return res.json({ ...load, bids: involved ? load.bids : [], customerEmail: involved ? load.customerEmail : null });
  } catch (error) { return next(error); }
});
router.post('/loads', async (req, res, next) => {
  try { if (!canPostLoad(req.user.role)) return res.status(403).json({ error: 'This account cannot post loads' }); const input = loadSchema.parse(req.body); if (input.postedForCustomer && req.user.role !== 'BROKER') return res.status(403).json({ error: 'Only brokers may post for third-party customers' }); const load = await prisma.marketplaceLoad.create({ data: { ...input, weightKg: input.weightKg ? String(input.weightKg) : null, posterId: req.user.userId, brokerId: req.user.role === 'BROKER' ? req.user.userId : null, status: 'POSTED' }, include: includeLoad }); return res.status(201).json(load); } catch (error) { return next(error); }
});
router.post('/loads/:id/bids', async (req, res, next) => {
  try {
    if (!canBid(req.user.role)) return res.status(403).json({ error: 'Only approved broker or carrier accounts may bid' });
    const input = offerSchema.parse(req.body);
    const [load, payoutProfile] = await Promise.all([prisma.marketplaceLoad.findUnique({ where: { id: req.params.id } }), prisma.providerPayoutProfile.findUnique({ where: { userId: req.user.userId } })]);
    if (!load || !['POSTED','BIDDING'].includes(load.status) || (load.expiresAt && load.expiresAt <= new Date())) return res.status(409).json({ error: 'Load is not accepting offers' });
    if (load.posterId === req.user.userId) return res.status(400).json({ error: 'Posters cannot bid on their own loads' });
    if (!payoutIsEligible(payoutProfile)) return res.status(409).json({ error: 'Complete provider verification and payout onboarding before submitting offers', code: 'PAYOUT_ONBOARDING_REQUIRED' });
    const bid = await prisma.$transaction(async (tx) => {
      const existing = await tx.marketplaceBid.findUnique({ where: { loadId_bidderId: { loadId: load.id, bidderId: req.user.userId } } });
      if (existing && ['ACCEPTED','REJECTED','WITHDRAWN','EXPIRED','CANCELLED'].includes(existing.status)) throw new Error('This offer can no longer be changed');
      const saved = existing
        ? await tx.marketplaceBid.update({ where: { id: existing.id }, data: { ...input, currency: input.currency.toLowerCase(), version: { increment: 1 }, status: 'SUBMITTED' } })
        : await tx.marketplaceBid.create({ data: { loadId: load.id, bidderId: req.user.userId, ...input, currency: input.currency.toLowerCase() } });
      await tx.marketplaceOfferHistory.create({ data: { offerId: saved.id, actorUserId: req.user.userId, action: existing ? 'UPDATED' : 'SUBMITTED', amountCents: saved.amountCents, currency: saved.currency, message: saved.message, conditions: saved.conditions, snapshotJson: offerSnapshot(saved) } });
      if (load.status === 'POSTED') await tx.marketplaceLoad.update({ where: { id: load.id }, data: { status: 'BIDDING' } });
      return saved;
    });
    return res.status(201).json(bid);
  } catch (error) { return next(error); }
});
router.post('/loads/:id/offers/:offerId/counter', async (req, res, next) => {
  try {
    const input = offerSchema.parse(req.body);
    const load = await prisma.marketplaceLoad.findUnique({ where: { id: req.params.id } });
    const offer = await prisma.marketplaceBid.findUnique({ where: { id: req.params.offerId } });
    if (!load || !offer || offer.loadId !== load.id) return res.status(404).json({ error: 'Offer not found' });
    if (!(canManageLoad(req.user, load) || offer.bidderId === req.user.userId)) return res.status(403).json({ error: 'Only the load owner and offer provider may negotiate this offer' });
    if (!['SUBMITTED','VIEWED','COUNTERED'].includes(offer.status)) return res.status(409).json({ error: 'Offer is not negotiable' });
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.marketplaceBid.update({ where: { id: offer.id }, data: { ...input, currency: input.currency.toLowerCase(), version: { increment: 1 }, status: 'COUNTERED' } });
      await tx.marketplaceOfferHistory.create({ data: { offerId: row.id, actorUserId: req.user.userId, action: 'COUNTERED', amountCents: row.amountCents, currency: row.currency, message: row.message, conditions: row.conditions, snapshotJson: offerSnapshot(row) } });
      return row;
    });
    return res.json(updated);
  } catch (error) { return next(error); }
});
router.post('/loads/:id/award/:bidId', async (req, res, next) => {
  try {
    const idempotencyKey = z.string().min(8).max(200).parse(req.headers['idempotency-key'] || req.body?.idempotencyKey);
    const load = await prisma.marketplaceLoad.findUnique({ where: { id: req.params.id }, include: { bids: { include: { bidder: true } } } });
    if (!load) return res.status(404).json({ error: 'Load not found' });
    if (!canManageLoad(req.user, load)) return res.status(403).json({ error: 'Only the poster or managing broker may award this load' });
    const bid = load.bids.find((row) => row.id === req.params.bidId && ['SUBMITTED','VIEWED','COUNTERED'].includes(row.status));
    if (!bid) return res.status(404).json({ error: 'Negotiable offer not found' });
    const existing = await prisma.marketplaceTransaction.findUnique({ where: { idempotencyKey } });
    if (existing) return res.json(existing);
    const profile = await prisma.providerPayoutProfile.findUnique({ where: { userId: bid.bidderId } });
    if (!payoutIsEligible(profile)) return res.status(409).json({ error: 'Selected provider is not eligible to receive payouts', code: 'PROVIDER_NOT_ELIGIBLE' });
    const rule = await resolveMarketplaceFee({ accountType: bid.bidder.role, currency: bid.currency });
    const split = calculateMarketplaceSplit(bid.amountCents, rule);
    assertMarketplaceTransition(load.status, 'AWARDED');
    const result = await prisma.$transaction(async (tx) => {
      await tx.marketplaceBid.updateMany({ where: { loadId: load.id, id: { not: bid.id } }, data: { status: 'REJECTED' } });
      const accepted = await tx.marketplaceBid.update({ where: { id: bid.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
      await tx.marketplaceOfferHistory.create({ data: { offerId: accepted.id, actorUserId: req.user.userId, action: 'ACCEPTED', amountCents: accepted.amountCents, currency: accepted.currency, message: accepted.message, conditions: accepted.conditions, snapshotJson: offerSnapshot(accepted) } });
      await tx.marketplaceLoad.update({ where: { id: load.id }, data: { status: 'AWARDED', awardedAmountCents: bid.amountCents, ...(bid.bidder.role === 'CARRIER' ? { carrierId: bid.bidderId } : { brokerId: bid.bidderId }) } });
      const transaction = await tx.marketplaceTransaction.create({ data: { idempotencyKey, loadId: load.id, offerId: bid.id, posterId: load.posterId, providerId: bid.bidderId, providerType: bid.bidder.role, currency: bid.currency, ...split, feeRuleSnapshotJson: feeRuleSnapshot(rule), agreementSnapshotJson: { load: { id: load.id, title: load.title, originCity: load.originCity, destinationCity: load.destinationCity, pickupDate: load.pickupDate }, offer: offerSnapshot(accepted), acceptedById: req.user.userId, acceptedAt: new Date().toISOString() } } });
      await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'MARKETPLACE_OFFER_ACCEPTED', entityType: 'MARKETPLACE_TRANSACTION', entityId: transaction.id, afterJson: { ...split, loadId: load.id, offerId: bid.id, feeRule: feeRuleSnapshot(rule) } } });
      return transaction;
    });
    return res.json(result);
  } catch (error) { return next(error); }
});
router.post('/loads/:id/assign-carrier', async (req, res, next) => { try { const load = await prisma.marketplaceLoad.findUnique({ where: { id: req.params.id } }); if (!load || load.brokerId !== req.user.userId) return res.status(403).json({ error: 'Managing broker required' }); const carrierId = z.string().parse(req.body?.carrierId); const carrier = await prisma.user.findFirst({ where: { id: carrierId, role: 'CARRIER', isActive: true } }); if (!carrier) return res.status(404).json({ error: 'Active carrier not found' }); return res.json(await prisma.marketplaceLoad.update({ where: { id: load.id }, data: { carrierId } })); } catch (error) { return next(error); } });
router.put('/loads/:id/status', async (req, res, next) => {
  try { const status = z.enum(['FUNDED','PICKED_UP','IN_TRANSIT','DELIVERED','COMPLETED','CANCELED','DISPUTED']).parse(req.body?.status); const load = await prisma.marketplaceLoad.findUnique({ where: { id: req.params.id } }); if (!load) return res.status(404).json({ error: 'Load not found' }); const isCarrierStep = ['PICKED_UP','IN_TRANSIT','DELIVERED'].includes(status); const permitted = isCarrierStep ? load.carrierId === req.user.userId : canManageLoad(req.user, load); if (!permitted) return res.status(403).json({ error: 'Forbidden for this load transition' }); assertMarketplaceTransition(load.status, status); if (status === 'DELIVERED' && !req.body?.proofOfDeliveryUrl) return res.status(400).json({ error: 'Proof of delivery is required' }); return res.json(await prisma.marketplaceLoad.update({ where: { id: load.id }, data: { status, ...(status === 'DELIVERED' ? { proofOfDeliveryUrl: String(req.body.proofOfDeliveryUrl), deliveredAt: new Date() } : {}) } })); } catch (error) { return next(error); }
});
router.get('/loads/:id/messages', async (req, res, next) => { try { const load = await prisma.marketplaceLoad.findUnique({ where: { id: req.params.id }, include: { bids: true } }); if (!load || !canAccessLoadConversation(req.user, load)) return res.status(403).json({ error: 'Forbidden' }); return res.json(await prisma.marketplaceMessage.findMany({ where: { loadId: load.id }, include: { sender: { select: { fullName: true, role: true } } }, orderBy: { createdAt: 'asc' } })); } catch (error) { return next(error); } });
router.post('/loads/:id/messages', async (req, res, next) => { try { const body = z.string().min(1).max(4000).parse(req.body?.body); const load = await prisma.marketplaceLoad.findUnique({ where: { id: req.params.id }, include: { bids: true } }); if (!load || !canAccessLoadConversation(req.user, load)) return res.status(403).json({ error: 'Forbidden' }); return res.status(201).json(await prisma.marketplaceMessage.create({ data: { loadId: load.id, senderId: req.user.userId, body } })); } catch (error) { return next(error); } });

router.get('/provider-profile', async (req, res, next) => { try { return res.json(await prisma.providerPayoutProfile.findUnique({ where: { userId: req.user.userId } })); } catch (error) { return next(error); } });
router.put('/provider-profile', async (req, res, next) => {
  try {
    if (!['BROKER','CARRIER','TENANT_ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Provider account required' });
    const input = z.object({ providerType: z.enum(['BROKER','CARRIER','TENANT']), legalName: z.string().min(2).max(200), businessName: z.string().max(200).optional(), country: z.string().length(2), contactJson: z.record(z.any()), taxInformationStatus: z.string().max(80).optional(), connectedAccountId: z.string().max(255).optional(), payoutMethod: z.string().max(80).optional(), termsAccepted: z.literal(true), marketplaceAccepted: z.literal(true) }).parse(req.body);
    const { termsAccepted: _termsAccepted, marketplaceAccepted: _marketplaceAccepted, ...profileInput } = input;
    const status = input.connectedAccountId ? 'UNDER_REVIEW' : 'INFORMATION_REQUIRED';
    const row = await prisma.providerPayoutProfile.upsert({ where: { userId: req.user.userId }, update: { ...profileInput, status, termsAcceptedAt: new Date(), marketplaceAcceptedAt: new Date() }, create: { userId: req.user.userId, ...profileInput, status, termsAcceptedAt: new Date(), marketplaceAcceptedAt: new Date() } });
    await prisma.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'PROVIDER_PAYOUT_PROFILE_UPDATED', entityType: 'PROVIDER_PAYOUT_PROFILE', entityId: row.id, afterJson: { status: row.status, providerType: row.providerType } } });
    return res.json(row);
  } catch (error) { return next(error); }
});

router.get('/transactions/mine', async (req, res, next) => { try { return res.json(await prisma.marketplaceTransaction.findMany({ where: { OR: [{ posterId: req.user.userId }, { providerId: req.user.userId }] }, include: { payout: true }, orderBy: { createdAt: 'desc' } })); } catch (error) { return next(error); } });
router.post('/transactions/:id/payment-session', async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Marketplace card payments are not configured' });
    const transaction = await prisma.marketplaceTransaction.findUnique({ where: { id: req.params.id } });
    if (!transaction || transaction.posterId !== req.user.userId) return res.status(403).json({ error: 'Load poster access required' });
    if (!['OFFER_ACCEPTED','PAYMENT_PENDING','PAYMENT_FAILED'].includes(transaction.status)) return res.status(409).json({ error: 'Transaction is not payable' });
    const session = await stripe.checkout.sessions.create({ mode: 'payment', client_reference_id: transaction.id, line_items: [{ quantity: 1, price_data: { currency: transaction.currency, unit_amount: transaction.grossCents, product_data: { name: `Loadlyx marketplace agreement ${transaction.loadId}`, description: 'Payment for the accepted, versioned marketplace offer.' } } }], success_url: `${env.frontendUrl}/loads/${transaction.loadId}?payment=success`, cancel_url: `${env.frontendUrl}/loads/${transaction.loadId}?payment=cancelled`, metadata: { marketplaceTransactionId: transaction.id, loadId: transaction.loadId, offerId: transaction.offerId } });
    await prisma.marketplaceTransaction.update({ where: { id: transaction.id }, data: { status: 'PAYMENT_PENDING', providerPaymentId: session.id } });
    return res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error) { return next(error); }
});
router.post('/transactions/:id/delivery-report', async (req, res, next) => {
  try { const transaction = await prisma.marketplaceTransaction.findUnique({ where: { id: req.params.id } }); if (!transaction || transaction.providerId !== req.user.userId) return res.status(403).json({ error: 'Provider access required' }); if (!['FUNDED','IN_PROGRESS'].includes(transaction.status)) return res.status(409).json({ error: 'Transaction is not ready for delivery reporting' }); return res.json(await prisma.marketplaceTransaction.update({ where: { id: transaction.id }, data: { status: 'DELIVERY_CONFIRMATION_PENDING', deliveryReportedAt: new Date() } })); } catch (error) { return next(error); }
});
router.post('/transactions/:id/confirm-delivery', async (req, res, next) => {
  try {
    const idempotencyKey = z.string().min(8).max(200).parse(req.headers['idempotency-key'] || req.body?.idempotencyKey);
    const transaction = await prisma.marketplaceTransaction.findUnique({ where: { id: req.params.id } });
    if (!transaction || transaction.posterId !== req.user.userId) return res.status(403).json({ error: 'Load poster access required' });
    if (!['DELIVERY_REPORTED','DELIVERY_CONFIRMATION_PENDING'].includes(transaction.status)) return res.status(409).json({ error: 'Delivery has not been reported' });
    const trust = await prisma.marketplaceTrustScore.findFirst({ where: { userId: transaction.providerId }, orderBy: { version: 'desc' } });
    const holdHours = trust?.riskBand === 'HIGH_RISK' ? 168 : trust?.riskBand === 'ELEVATED_RISK' ? 72 : 24;
    const availableAt = new Date(Date.now() + holdHours * 3600000);
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.marketplaceTransaction.update({ where: { id: transaction.id }, data: { status: trust?.payoutHold ? 'DISPUTED' : 'PAYOUT_PENDING', deliveryConfirmedAt: new Date(), deliveryConfirmedById: req.user.userId, settlementAvailableAt: availableAt, riskHold: Boolean(trust?.payoutHold), riskHoldReason: trust?.payoutHold ? 'Trust and risk policy hold' : null } });
      if (!trust?.payoutHold) await tx.marketplacePayout.upsert({ where: { transactionId: transaction.id }, update: {}, create: { transactionId: transaction.id, idempotencyKey, provider: transaction.provider, amountCents: transaction.providerNetCents, currency: transaction.currency, availableAt } });
      return updated;
    });
    return res.json(result);
  } catch (error) { return next(error); }
});

router.get('/admin/fee-rules', async (req, res, next) => { try { if (!['SUPER_ADMIN','PLATFORM_ADMIN','ADMIN','SUPPORT'].includes(req.user.role)) return res.status(403).json({ error: 'Platform role required' }); return res.json(await prisma.marketplaceFeeRule.findMany({ orderBy: [{ accountType: 'asc' }, { version: 'desc' }] })); } catch (error) { return next(error); } });
router.post('/admin/fee-rules', async (req, res, next) => {
  try {
    if (!['SUPER_ADMIN','PLATFORM_ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Platform finance administrator required' });
    const input = z.object({ scopeKey: z.string().min(2).max(120), accountType: z.enum(['MARKETPLACE_USER','BROKER','CARRIER','TENANT_ADMIN']), percentageBps: z.number().int().min(0).max(10000), fixedFeeCents: z.number().int().min(0).default(0), minimumFeeCents: z.number().int().min(0).default(0), maximumFeeCents: z.number().int().positive().optional(), currency: z.string().length(3).default('cad'), taxTreatment: z.string().max(80).default('EXCLUSIVE'), refundTreatment: z.string().max(80).default('PRO_RATA'), effectiveAt: z.coerce.date(), expiresAt: z.coerce.date().optional() }).parse(req.body);
    const latest = await prisma.marketplaceFeeRule.findFirst({ where: { scopeKey: input.scopeKey }, orderBy: { version: 'desc' } });
    const row = await prisma.marketplaceFeeRule.create({ data: { ...input, currency: input.currency.toLowerCase(), version: (latest?.version || 0) + 1, createdById: req.user.userId } });
    await prisma.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'MARKETPLACE_FEE_RULE_CREATED', entityType: 'MARKETPLACE_FEE_RULE', entityId: row.id, afterJson: row } });
    return res.status(201).json(row);
  } catch (error) { return next(error); }
});
router.post('/admin/trust/:userId/recalculate', async (req, res, next) => { try { if (!['SUPER_ADMIN','PLATFORM_ADMIN','ADMIN','SUPPORT'].includes(req.user.role)) return res.status(403).json({ error: 'Platform role required' }); return res.json(await calculateTrustScore(req.params.userId)); } catch (error) { return next(error); } });
export default router;
