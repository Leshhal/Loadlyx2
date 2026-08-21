import { resolveTenant } from '../lib/tenant.js';
import { Router } from 'express';
import Stripe from 'stripe';
import { getCommissionPolicy, recordStoreSettlement } from '../services/ledgerService.js';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { z } from 'zod';
import { calculateShipping } from '../utils/shipping.js';
import { recordRefund } from '../services/ledgerService.js';
import { capturePaypalOrder, createPaypalOrder, refundPaypalCapture } from '../services/paypalService.js';

const router = Router();
const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

router.get('/payment-methods', async (req, res) => {
  if (!req.tenant?.id) return res.status(404).json({ error: 'Tenant storefront not found' });
  const [tenant, cryptoSettings] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: req.tenant.id }, select: { brandingJson: true } }),
    prisma.cryptoPaymentSettings.findUnique({ where: { tenantId: req.tenant.id } })
  ]);
  const settings = tenant?.brandingJson?.paymentSettings || {};
  return res.json({
    card: { status: !stripe ? 'CONFIGURATION REQUIRED' : env.stripeSecretKey.startsWith('sk_live_') ? 'CONFIGURED' : 'SANDBOX', provider: 'STRIPE', tenantConnected: Boolean(settings.stripeAccountId), liveVerified: false },
    paypal: { status: process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && settings.paypalMerchantId ? (process.env.PAYPAL_MODE === 'LIVE' ? 'CONFIGURED' : 'SANDBOX') : 'CONFIGURATION REQUIRED', provider: 'PAYPAL', liveVerified: false },
    crypto: { status: cryptoSettings?.enabled ? (cryptoSettings.provider === 'MOCK' ? 'MOCK' : 'EXTERNAL_VERIFICATION_REQUIRED') : 'DISABLED', provider: cryptoSettings?.provider || 'MOCK', acceptedAssets: cryptoSettings?.acceptedAssets || [] }
  });
});
const PLATFORM_ROLES = new Set(['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT']);

function checkoutOrigin(req) {
  const fallback = String(env.frontendUrl || 'http://localhost:3000').replace(/\/$/, '');
  try {
    const origin = new URL(String(req.headers.origin || fallback));
    const rootDomain = process.env.ROOT_DOMAIN || 'loadlyx.com';
    const allowed = ['http:', 'https:'].includes(origin.protocol) && (
      ['localhost', '127.0.0.1'].includes(origin.hostname) ||
      origin.hostname === rootDomain ||
      origin.hostname.endsWith(`.${rootDomain}`) ||
      origin.hostname.endsWith('.vercel.app')
    );
    return allowed ? origin.origin : fallback;
  } catch { return fallback; }
}

function orderScope(req) {
  if (PLATFORM_ROLES.has(req.user?.role)) return {};
  return req.user?.tenantId ? { tenantId: req.user.tenantId } : null;
}

router.get('/', async (req, res) => {
try {
const scope = orderScope(req);
if (!scope) {
return res.status(401).json({ error: 'Unauthorized' });
}

const orders = await prisma.order.findMany({
where: scope,
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
const scope = orderScope(req);
if (!scope) {
return res.status(401).json({ error: 'Unauthorized' });
}

const order = await prisma.order.findFirst({
where: {
id: req.params.id,
...scope
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
const scope = orderScope(req);
if (!scope) {
return res.status(401).json({ error: 'Unauthorized' });
}

const { status, paymentStatus, adminNotes } = req.body;

const existing = await prisma.order.findFirst({
where: {
id: req.params.id,
...scope
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

router.post('/:id/fulfillment', async (req, res) => {
  const scope = orderScope(req);
  if (!scope) return res.status(401).json({ error: 'Unauthorized' });
  const input = z.object({ action: z.enum(['CONFIRM', 'PROCESS', 'SHIP', 'DELIVER', 'CANCEL']), shippingCarrier: z.string().trim().max(80).optional(), trackingNumber: z.string().trim().max(120).optional(), note: z.string().trim().max(1000).optional() }).parse(req.body);
  const order = await prisma.order.findFirst({ where: { id: req.params.id, ...scope } });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (input.action === 'SHIP' && !input.trackingNumber) return res.status(400).json({ error: 'Tracking number is required to mark an order shipped' });
  const states = { CONFIRM: { fulfillmentStatus: 'CONFIRMED', confirmedAt: new Date() }, PROCESS: { fulfillmentStatus: 'PROCESSING' }, SHIP: { fulfillmentStatus: 'SHIPPED', shippedAt: new Date(), shippingCarrier: input.shippingCarrier || null, trackingNumber: input.trackingNumber }, DELIVER: { fulfillmentStatus: 'DELIVERED', deliveredAt: new Date(), status: 'FULFILLED' }, CANCEL: { fulfillmentStatus: 'CANCELED', status: 'CANCELED' } };
  const updated = await prisma.order.update({ where: { id: order.id }, data: { ...states[input.action], ...(input.note ? { adminNotes: [order.adminNotes, input.note].filter(Boolean).join('\n') } : {}) }, include: { items: true } });
  return res.json(updated);
});

router.post('/:id/refund', async (req, res) => {
  const scope = orderScope(req);
  if (!scope) return res.status(401).json({ error: 'Unauthorized' });
  const input = z.object({ amountCents: z.number().int().positive(), reason: z.string().trim().min(3).max(500), manual: z.boolean().default(false) }).parse(req.body);
  const order = await prisma.order.findFirst({ where: { id: req.params.id, ...scope } });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const remaining = order.totalCents - order.refundedCents;
  if (input.amountCents > remaining) return res.status(409).json({ error: 'Refund exceeds the remaining refundable amount', remainingCents: remaining });
  if (!order.stripePaymentIntentId && !order.paypalCaptureId && !input.manual) return res.status(409).json({ error: 'This order has no processor payment. Confirm a manual refund instead.' });
  let providerRefund = null;
  if (order.stripePaymentIntentId) {
    if (!stripe) return res.status(503).json({ error: 'Stripe is not configured' });
    providerRefund = await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId, amount: input.amountCents, reason: 'requested_by_customer', metadata: { orderId: order.id, note: input.reason } });
  } else if (order.paypalCaptureId) {
    providerRefund = await refundPaypalCapture(order.paypalCaptureId, input.amountCents, order.currency, `loadlyx-refund-${order.id}-${order.refundedCents}`);
  }
  const original = await prisma.financialTransaction.findFirst({ where: { referenceType: 'ORDER', referenceId: order.id, kind: 'STORE_SALE' }, include: { ledgerEntries: true } });
  const result = await prisma.$transaction(async (tx) => {
    if (original) await recordRefund(tx, original, input.amountCents, input.reason, providerRefund?.id || `manual-${Date.now()}`);
    return tx.order.update({ where: { id: order.id }, data: { refundedCents: { increment: input.amountCents }, ...(input.amountCents === remaining ? { paymentStatus: 'REFUNDED' } : {}), adminNotes: [order.adminNotes, `Refund ${input.amountCents} cents: ${input.reason}${input.manual ? ' (manual)' : ''}`].filter(Boolean).join('\n') }, include: { items: true } });
  });
  return res.json({ order: result, providerRefundId: providerRefund?.id || null, ledgerRecorded: Boolean(original) });
});

router.get('/checkout-session/:sessionId', async (req, res, next) => {
 try {
  if (!stripe) {
    return res.status(400).json({ error: 'Stripe is not configured.' });
  }

  const session = await stripe.checkout.sessions.retrieve(req.params.sessionId, {
    expand: ['line_items', 'customer_details']
  });

  const order = session.metadata?.orderId
    ? await prisma.order.findFirst({
        where: { id: session.metadata.orderId, tenantId: req.tenant.id },
        include: { items: true, tenant: { select: { slug: true, name: true } } }
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
 } catch (error) { next(error); }
});



router.post('/checkout', async (req, res, next) => {
 try {
  const schema = z.object({
    customerEmail: z.string().email(),
    customerName: z.string().optional(),
    shippingCountry: z.string().default('CA'),
    shippingProvince: z.string().optional(),
    shippingState: z.string().optional(),
    items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
    paymentMethod: z.enum(['STRIPE','PAYPAL']).default('STRIPE'),
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
  const checkoutTenant = await prisma.tenant.findUnique({ where: { id: req.tenant.id }, select: { isDemo: true, brandingJson: true } });
  if (checkoutTenant?.isDemo) {
    return res.status(409).json({ error: 'DEMO_CHECKOUT_DISABLED', message: 'This demo storefront does not process real payments or create financial transactions.' });
  }
  const paymentSettings = checkoutTenant?.brandingJson?.paymentSettings || {};
  if (input.paymentMethod === 'STRIPE' && !stripe) return res.status(503).json({ error: 'Card checkout is not configured' });
  if (input.paymentMethod === 'PAYPAL') {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return res.status(503).json({ error: 'PayPal checkout is not configured' });
    if (!paymentSettings.paypalMerchantId) return res.status(409).json({ error: 'PayPal is not connected for this tenant' });
  }
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



  const commissionPolicy = await getCommissionPolicy(prisma, req.tenant.id);
  const applicationFeeCents = Math.round((subtotalCents * commissionPolicy.storeCommissionBps) / 10000);
  if (input.paymentMethod === 'PAYPAL') {
    if (!paymentSettings.paypalMerchantId) return res.status(409).json({ error: 'PayPal is not connected for this tenant' });
    const origin = checkoutOrigin(req);
    const paypalOrder = await createPaypalOrder({ orderId: order.id, totalCents, currency: env.stripeCurrency, returnUrl: `${origin}/checkout/paypal?order_id=${order.id}`, cancelUrl: `${origin}/checkout/cancel`, payeeMerchantId: paymentSettings.paypalMerchantId });
    await prisma.order.update({ where: { id: order.id }, data: { paypalOrderId: paypalOrder.id } });
    return res.status(201).json({ orderId: order.id, checkoutUrl: paypalOrder.links?.find((link) => link.rel === 'approve')?.href || null, provider: 'PAYPAL', order });
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${checkoutOrigin(req)}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${checkoutOrigin(req)}/checkout/cancel`,
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
      orderId: order.id,
      commissionBps: String(commissionPolicy.storeCommissionBps),
      applicationFeeCents: String(applicationFeeCents)
    },
    ...(paymentSettings.stripeAccountId ? { payment_intent_data: { application_fee_amount: applicationFeeCents, transfer_data: { destination: paymentSettings.stripeAccountId }, metadata: { tenantId: req.tenant.id, orderId: order.id, commissionBps: String(commissionPolicy.storeCommissionBps) } } } : {})
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeCheckoutSessionId: session.id }
  });

  res.status(201).json({ orderId: order.id, checkoutUrl: session.url, shipping, order });
 } catch (error) {
   if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid checkout request', details: error.issues });
   next(error);
 }
});

router.post('/paypal/:orderId/capture', async (req, res, next) => {
  try {
    if (!req.tenant?.id) return res.status(404).json({ error: 'Tenant storefront not found' });
    const order = await prisma.order.findFirst({ where: { id: req.params.orderId, tenantId: req.tenant.id } });
    if (!order?.paypalOrderId) return res.status(404).json({ error: 'PayPal order not found' });
    if (order.paymentStatus === 'PAID') return res.json({ order, duplicate: true });
    const result = await capturePaypalOrder(order.paypalOrderId, order.id);
    const capture = result.purchase_units?.flatMap((unit) => unit.payments?.captures || []).find((row) => row.status === 'COMPLETED');
    if (!capture) return res.status(409).json({ error: 'PayPal capture is not complete' });
    if (String(capture.custom_id || capture.invoice_id || order.id) !== order.id) return res.status(409).json({ error: 'PayPal capture does not match this order' });
    const capturedCents = Math.round(Number(capture.amount?.value || 0) * 100);
    if (capturedCents !== order.totalCents || String(capture.amount?.currency_code || '').toLowerCase() !== order.currency.toLowerCase()) return res.status(409).json({ error: 'PayPal capture amount or currency mismatch' });
    const saved = await prisma.$transaction(async (tx) => {
      const fresh = await tx.order.findUnique({ where: { id: order.id } });
      if (fresh.paymentStatus === 'PAID') return fresh;
      const updated = await tx.order.update({ where: { id: order.id }, data: { paypalCaptureId: capture.id, paymentStatus: 'PAID', status: 'PAID' } });
      await recordStoreSettlement(tx, { tenantId: order.tenantId, orderId: order.id, grossCents: order.totalCents, taxCents: 0, processorFeeCents: 0, currency: order.currency, source: 'paypal:capture', idempotencyKey: `paypal-settlement:${capture.id}` });
      return updated;
    });
    return res.json({ order: saved, provider: 'PAYPAL', captureId: capture.id });
  } catch (error) { return next(error); }
});

export default router;
