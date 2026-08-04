import express, { Router } from 'express';
import Stripe from 'stripe';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { recordMarketplaceSettlement, recordStoreSettlement } from '../services/ledgerService.js';

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
await prisma.$transaction(async (tx) => {
  const order = await tx.order.update({
    where: { id: orderId },
    data: {
      status: 'PAID',
      paymentStatus: 'PAID',
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent
    }
  });
  const settlement = await recordStoreSettlement(tx, order, {
    taxCents: session.total_details?.amount_tax || 0,
    discountCents: session.total_details?.amount_discount || 0,
    processorFeeCents: 0
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
        if (orderId) {
          await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELED' } });
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
