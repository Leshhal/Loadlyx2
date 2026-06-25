import { resolveTenant } from '../lib/tenant.js';
import { Router } from 'express';
import Stripe from 'stripe';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { z } from 'zod';
import { calculateShipping } from '../utils/shipping.js';

const router = Router();
const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

router.get('/', async (req, res) => {
try {
const tenantId = req.user?.tenantId;

if (!tenantId) {
return res.status(401).json({ error: 'Unauthorized' });
}

const orders = await prisma.order.findMany({
where: { tenantId },
orderBy: { createdAt: 'desc' },
include: {
items: true
}
});

res.json(orders);
} catch (error) {
console.error('Error fetching orders:', error);
res.status(500).json({ error: 'Failed to fetch orders' });
}
});

router.get('/:id', async (req, res) => {
try {
const tenantId = req.user?.tenantId;

if (!tenantId) {
return res.status(401).json({ error: 'Unauthorized' });
}

const order = await prisma.order.findFirst({
where: {
id: req.params.id,
tenantId
},
include: {
items: true
}
});

if (!order) {
return res.status(404).json({ error: 'Order not found' });
}

res.json(order);
} catch (error) {
console.error('Error fetching order:', error);
res.status(500).json({ error: 'Failed to fetch order' });
}
});

router.put('/:id', async (req, res) => {
try {
const tenantId = req.user?.tenantId;

if (!tenantId) {
return res.status(401).json({ error: 'Unauthorized' });
}

const { status, paymentStatus, adminNotes } = req.body;

const existing = await prisma.order.findFirst({
where: {
id: req.params.id,
tenantId
}
});

if (!existing) {
return res.status(404).json({ error: 'Order not found' });
}

const updated = await prisma.order.update({
where: { id: req.params.id },
data: {
...(status ? { status } : {}),
...(paymentStatus ? { paymentStatus } : {}),
...(adminNotes !== undefined ? { adminNotes } : {})
},
include: {
items: true
}
});

res.json(updated);
} catch (error) {
console.error('Error updating order:', error);
res.status(500).json({ error: 'Failed to update order' });
}
});

router.get('/session/:sessionId', async (req, res) => {
  if (!stripe) {
    return res.status(400).json({ error: 'Stripe is not configured.' });
  }

  const session = await stripe.checkout.sessions.retrieve(req.params.sessionId, {
    expand: ['line_items', 'customer_details']
  });

  const order = session.metadata?.orderId
    ? await prisma.order.findFirst({
        where: { id: session.metadata.orderId, tenantId: req.tenant.id },
        include: { items: true }
      })
    : null;

  res.json({
    session: {
      id: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
      customerName: session.customer_details?.name,
      amountTotal: session.amount_total,
      currency: session.currency
    },
    order
  });
});



router.post('/checkout', async (req, res) => {
  const schema = z.object({
    customerEmail: z.string().email(),
    customerName: z.string().optional(),
    shippingCountry: z.string().default('CA'),
    shippingProvince: z.string().optional(),
    shippingState: z.string().optional(),
    items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
    attribution: z.object({
      sessionId: z.string().optional(),
      referrer: z.string().optional(),
      landingPage: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      utmTerm: z.string().optional(),
      utmContent: z.string().optional()
    }).optional()
  });

  const input = schema.parse(req.body);
  const products = await prisma.product.findMany({
    where: {
      tenantId: req.tenant.id,
      isActive: true,
      id: { in: input.items.map((item) => item.productId) }
    }
  });

  const enrichedItems = input.items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    return {
      product,
      quantity: item.quantity,
      weightKg: Number(product.weightKg),
      lineTotalCents: product.priceCents * item.quantity
    };
  });

  const subtotalCents = enrichedItems.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const shipping = calculateShipping({
    country: input.shippingCountry,
    items: enrichedItems.map((item) => ({ weightKg: item.weightKg, quantity: item.quantity }))
  });
  const totalCents = subtotalCents + shipping.shippingCents;

  const order = await prisma.order.create({
    data: {
      tenantId: req.tenant.id,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      shippingCountry: input.shippingCountry,
      shippingProvince: input.shippingProvince,
      shippingState: input.shippingState,
      subtotalCents,
      shippingCents: shipping.shippingCents,
      totalCents,
      notes: shipping.placeholder ? shipping.message : shipping.method,
      attributionSessionId: input.attribution?.sessionId,
      attributionReferrer: input.attribution?.referrer,
      attributionLandingPage: input.attribution?.landingPage,
      attributionUtmSource: input.attribution?.utmSource,
      attributionUtmMedium: input.attribution?.utmMedium,
      attributionUtmCampaign: input.attribution?.utmCampaign,
      attributionUtmTerm: input.attribution?.utmTerm,
      attributionUtmContent: input.attribution?.utmContent,
      items: {
        create: enrichedItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          unitPriceCents: item.product.priceCents,
          weightKg: item.product.weightKg
        }))
      }
    },
    include: { items: true }
  });

  if (!stripe) {
    return res.status(201).json({
      order,
      shipping,
      checkoutMode: 'stripe-disabled',
      message: 'Stripe secret key not configured yet. Order saved locally.'
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${env.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.frontendUrl}/checkout/cancel`,
    customer_email: input.customerEmail,
    billing_address_collection: 'auto',
    shipping_address_collection: {
      allowed_countries: ['CA', 'US']
    },
    line_items: [
      ...enrichedItems.map((item) => ({
        price_data: {
          currency: env.stripeCurrency,
          product_data: {
            name: item.product.name,
            description: item.product.description || undefined
          },
          unit_amount: item.product.priceCents
        },
        quantity: item.quantity
      })),
      {
        price_data: {
          currency: env.stripeCurrency,
          product_data: { name: `Shipping (${shipping.method})` },
          unit_amount: shipping.shippingCents
        },
        quantity: 1
      }
    ],
    metadata: {
      tenantId: req.tenant.id,
      orderId: order.id
    }
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeCheckoutSessionId: session.id }
  });

  res.status(201).json({ orderId: order.id, checkoutUrl: session.url, shipping, order });
});

export default router;
