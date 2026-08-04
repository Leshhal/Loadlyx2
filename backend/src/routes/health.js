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

export default router;
