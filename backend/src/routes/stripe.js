import express, { Router } from 'express';
import Stripe from 'stripe';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { recordMarketplaceSettlement, recordStoreSettlement } from '../services/ledgerService.js';
import { validateStripeStoreSession } from '../services/commerceCheckoutPolicy.js';
import { handleSubscriptionEvent } from '../services/subscriptionBilling.js';

const router = Router();
const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !env.stripeWebhookSecret) {
    return res.status(400).send('Stripe webhook is not configured.');
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).send('Missing Stripe signature.');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.stripeWebhookSecret);
  } catch (error) {
    console.error('Stripe webhook verification failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (await handleSubscriptionEvent({ db: prisma, stripeClient: stripe, event })) return res.json({ received: true });
    switch (event.type) {
      case 'checkout.session.completed': {
const session = event.data.object;
const orderId = session.metadata?.orderId;
const marketplaceTransactionId = session.metadata?.marketplaceTransactionId;

if (marketplaceTransactionId) {
  await prisma.$transaction(async (tx) => {
    const marketplaceTransaction = await tx.marketplaceTransaction.findUnique({ where: { id: marketplaceTransactionId } });
    if (!marketplaceTransaction || marketplaceTransaction.status === 'FUNDED') return;
    const updated = await tx.marketplaceTransaction.update({ where: { id: marketplaceTransaction.id }, data: { status: 'FUNDED', providerPaymentId: String(session.payment_intent || session.id), fundedAt: new Date() } });
    await tx.marketplaceLoad.update({ where: { id: marketplaceTransaction.loadId }, data: { status: 'FUNDED' } });
    await recordMarketplaceSettlement(tx, { id: updated.id, grossCents: updated.grossCents, taxCents: updated.taxCents, processorFeeCents: updated.processorFeeCents, platformFeeCents: updated.platformFeeCents, providerNetCents: updated.providerNetCents, currency: updated.currency, brokerMarginBps: 0, brokerUserId: updated.providerType === 'BROKER' ? updated.providerId : null, carrierUserId: updated.providerType === 'CARRIER' ? updated.providerId : null });
  });
}

if (orderId) {
const existingOrder = await prisma.order.findUnique({ where: { id: orderId }, include: { tenant: { select: { isDemo: true, isActive: true } } } });
if (!validateStripeStoreSession(existingOrder, session)) {
  return res.status(409).json({ error: 'Stripe checkout confirmation does not match the stored order' });
}
if (existingOrder.paymentStatus === 'PAID' || existingOrder.paymentStatus === 'REFUNDED' || existingOrder.refundedCents > 0) break;
let processorFeeCents = 0;
if (session.payment_intent) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(String(session.payment_intent), { expand: ['latest_charge.balance_transaction'] });
    processorFeeCents = Number(paymentIntent.latest_charge?.balance_transaction?.fee || 0);
  } catch (feeError) {
    console.warn('Stripe processor fee unavailable during settlement:', feeError.message);
  }
}
await prisma.$transaction(async (tx) => {
  const freshOrder = await tx.order.findUnique({ where: { id: orderId }, include: { tenant: { select: { isDemo: true, isActive: true } } } });
  if (!validateStripeStoreSession(freshOrder, session)) throw new Error('Stripe order confirmation changed during settlement');
  if (freshOrder.paymentStatus === 'PAID' || freshOrder.paymentStatus === 'REFUNDED' || freshOrder.refundedCents > 0) return;
  const claimed = await tx.order.updateMany({
    where: { id: orderId, paymentStatus: 'PENDING', refundedCents: 0 },
    data: {
      status: 'PAID',
      paymentStatus: 'PAID',
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent
    }
  });
  if (claimed.count !== 1) return;
  const order = await tx.order.findUnique({ where: { id: orderId } });
  const settlement = await recordStoreSettlement(tx, order, {
    taxCents: session.total_details?.amount_tax || 0,
    discountCents: session.total_details?.amount_discount || 0,
    processorFeeCents,
    commissionBps: Number(session.metadata?.commissionBps)
  });
  await tx.tenantLedger.upsert({
    where: { orderId },
    update: { status: 'available' },
    create: {
      tenantId: order.tenantId,
      orderId,
      grossCents: settlement.grossCents,
      feeCents: settlement.platformCommissionCents,
      netCents: settlement.tenantProceedsCents,
      status: 'available'
    }
  });
});
}
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;
        const marketplaceTransactionId = session.metadata?.marketplaceTransactionId;
        if (marketplaceTransactionId) await prisma.marketplaceTransaction.updateMany({ where: { id: marketplaceTransactionId, status: { in: ['PAYMENT_PENDING','PAYMENT_PROCESSING'] } }, data: { status: 'PAYMENT_FAILED' } });
        if (orderId && session.metadata?.tenantId) {
          await prisma.order.updateMany({ where: { id: orderId, tenantId: session.metadata.tenantId, stripeCheckoutSessionId: session.id, paymentStatus: 'PENDING', status: 'PENDING' }, data: { status: 'CANCELED' } });
        }
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed:', error);
    res.status(500).json({ error: 'Webhook handler failed.' });
  }
});

export default router;
