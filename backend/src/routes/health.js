import { Router } from 'express';
import { prisma } from '../db/prisma.js';

const router = Router();
router.get('/', (req, res) => {
  res.json({ ok: true, service: 'loadlyx-backend', version: '3.2.0', tenant: req.tenant?.slug || null, timestamp: new Date().toISOString() });
});

router.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ ready: true, database: 'available', queue: 'postgres-durable', timestamp: new Date().toISOString() });
  } catch {
    return res.status(503).json({ ready: false, database: 'unavailable', timestamp: new Date().toISOString() });
  }
});

router.get('/providers', async (_req, res) => {
  try {
    const [partners, queued, running] = await Promise.all([
      prisma.freightServicePartner.findMany({ select: { serviceType: true, name: true, status: true, enabled: true, externalApiConfigured: true } }),
      prisma.backgroundJob.count({ where: { status: { in: ['QUEUED','RETRY_SCHEDULED'] } } }),
      prisma.backgroundJob.count({ where: { status: 'RUNNING' } })
    ]);
    return res.json({ database: 'available', worker: { queue: 'postgres-durable', queued, running }, payments: { stripe: Boolean(process.env.STRIPE_SECRET_KEY) }, blockchain: { listenerConfigured: Boolean(process.env.CRYPTO_LISTENER_URL) }, freightServices: partners, timestamp: new Date().toISOString() });
  } catch { return res.status(503).json({ database: 'unavailable', timestamp: new Date().toISOString() }); }
});

export default router;
