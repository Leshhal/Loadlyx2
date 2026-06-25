import express, { Router } from 'express';
import Stripe from 'stripe';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';

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

if (orderId) {
await prisma.order.update({
where: { id: orderId },
data: {
paymentStatus: 'PAID',
stripeCheckoutSessionId: session.id,
stripePaymentIntentId: session.payment_intent
}
});

await prisma.tenantLedger.updateMany({
where: { orderId },
data: {
status: 'available'
}
});
}
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;
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
