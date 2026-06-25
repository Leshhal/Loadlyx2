import express from 'express';
import { prisma } from '../db/prisma.js';

const router = express.Router();

router.get('/', async (req, res) => {
try {
const tenantId = req.headers['x-tenant-id'];

console.log('TENANT ID:', tenantId);

if (!tenantId) {
return res.status(400).json({
error: 'Tenant ID required'
});
}

const customers =
await prisma.customer.findMany({
where: {
tenantId
},
orderBy: {
createdAt: 'desc'
}
});

console.log(
'CUSTOMERS FOUND:',
customers
);

return res.json(customers);

} catch (err) {
console.error(
'CUSTOMERS ERROR:',
err
);

return res.status(500).json({
error: 'Failed to load customers'
});
}
});

export default router;