import { Router, raw } from 'express';
import { prisma } from '../db/prisma.js';
import { paypalPayloadHash, verifyPaypalWebhook } from '../services/paypalService.js';

const router = Router();
router.post('/webhook', raw({ type: 'application/json', limit: '1mb' }), async (req, res, next) => {
  try {
    const event = JSON.parse(req.body.toString('utf8'));
    if (!(await verifyPaypalWebhook(req.headers, event))) return res.status(401).json({ error: 'Invalid PayPal webhook signature' });
    const eventId = String(event.id || '');
    if (!eventId) return res.status(400).json({ error: 'PayPal event ID is required' });
    const existing = await prisma.paypalWebhookEvent.findUnique({ where: { providerEventId: eventId } });
    if (existing) return res.json({ received: true, duplicate: true });
    const providerOrderId = event.resource?.supplementary_data?.related_ids?.order_id || event.resource?.id;
    const order = providerOrderId ? await prisma.order.findFirst({ where: { OR: [{ paypalOrderId: String(providerOrderId) }, { paypalCaptureId: String(providerOrderId) }] } }) : null;
    await prisma.paypalWebhookEvent.create({ data: { providerEventId: eventId, eventType: String(event.event_type || 'UNKNOWN'), orderId: order?.id || null, payloadHash: paypalPayloadHash(event) } });
    return res.json({ received: true });
  } catch (error) { return next(error); }
});

export default router;
