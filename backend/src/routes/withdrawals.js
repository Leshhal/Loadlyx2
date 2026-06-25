import express from 'express';
import { prisma } from '../db/prisma.js';

const router = express.Router();

router.get('/', async (req, res) => {
try {
const tenantId = req.headers['x-tenant-id'];

const withdrawals =
await prisma.withdrawalRequest.findMany({
where: { tenantId },
orderBy: {
createdAt: 'desc'
}
});

return res.json(withdrawals);

} catch (err) {
console.error(err);

return res.status(500).json({
error: 'Failed to load withdrawals'
});
}
});

router.post('/request', async (req, res) => {
try {
const tenantId = req.headers['x-tenant-id'];

const { amountCents } = req.body;

if (!amountCents || amountCents <= 0) {
return res.status(400).json({
error: 'Invalid amount'
});
}

const withdrawal =
await prisma.withdrawalRequest.create({
data: {
tenantId,
amountCents,
status: 'pending'
}
});

return res.json(withdrawal);

} catch (err) {
console.error(err);

return res.status(500).json({
error: 'Failed to request withdrawal'
});
}
});

export default router;