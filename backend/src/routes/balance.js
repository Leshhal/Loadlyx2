import express from 'express';
import { prisma } from '../db/prisma.js';

const router = express.Router();

router.get('/', async (req, res) => {
try {
const tenantId = req.headers['x-tenant-id'];

if (!tenantId) {
return res.status(400).json({ error: 'Tenant ID required' });
}

const availableAgg = await prisma.tenantLedger.aggregate({
where: {
tenantId,
status: 'available'
},
_sum: {
netCents: true,
grossCents: true,
feeCents: true
}
});

const pendingAgg = await prisma.tenantLedger.aggregate({
where: {
tenantId,
status: 'pending'
},
_sum: {
netCents: true,
grossCents: true,
feeCents: true
}
});

const ledger = await prisma.tenantLedger.findMany({
where: { tenantId },
orderBy: { createdAt: 'desc' },
take: 20
});

return res.json({
availableCents: availableAgg._sum.netCents || 0,
pendingCents: pendingAgg._sum.netCents || 0,
grossSalesCents:
(availableAgg._sum.grossCents || 0) +
(pendingAgg._sum.grossCents || 0),
platformFeesCents:
(availableAgg._sum.feeCents || 0) +
(pendingAgg._sum.feeCents || 0),
ledger
});
} catch (err) {
console.error('BALANCE ERROR:', err);
return res.status(500).json({ error: 'Failed to load balance' });
}
});

export default router;
