import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { getTenantBalance } from '../services/balanceService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Tenant account required' });
    const balance = await getTenantBalance(prisma, tenantId);
    const ledger = await prisma.ledgerEntry.findMany({
      where: { tenantId, account: 'TENANT' },
      include: { transaction: { select: { kind: true, status: true, referenceType: true, referenceId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return res.json({ ...balance, ledger });
  } catch (error) {
    console.error('Balance error:', error);
    return res.status(500).json({ error: 'Failed to load balance' });
  }
});

export default router;
