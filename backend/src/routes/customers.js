import express from 'express';
import { prisma } from '../db/prisma.js';

const router = express.Router();
const PLATFORM_ROLES = new Set(['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT']);

router.get('/', async (req, res) => {
  try {
    const requestedTenantId = typeof req.query.tenantId === 'string' ? req.query.tenantId : null;
    const tenantId = PLATFORM_ROLES.has(req.user?.role) ? requestedTenantId : req.user?.tenantId;
    if (!tenantId && !PLATFORM_ROLES.has(req.user?.role)) return res.status(403).json({ error: 'Tenant account required' });
    const scope = tenantId ? { tenantId } : {};
    const [storedCustomers, orders, quotes] = await Promise.all([
      prisma.customer.findMany({ where: scope, orderBy: { createdAt: 'desc' } }),
      prisma.order.findMany({ where: scope, select: { id: true, tenantId: true, customerEmail: true, customerName: true, totalCents: true, paymentStatus: true, fulfillmentStatus: true, createdAt: true } }),
      prisma.quote.findMany({ where: scope, select: { id: true, tenantId: true, fullName: true, email: true, phone: true, status: true, createdAt: true } })
    ]);
    const customers = new Map();
    const upsert = (email, values) => {
      const key = String(email || '').trim().toLowerCase();
      if (!key) return;
      const current = customers.get(key) || { email: key, name: null, phone: null, tenantId: values.tenantId, orderCount: 0, quoteCount: 0, paidCents: 0, latestActivityAt: null, orders: [], quotes: [] };
      if (values.name) current.name = values.name;
      if (values.phone) current.phone = values.phone;
      if (values.createdAt && (!current.latestActivityAt || new Date(values.createdAt) > new Date(current.latestActivityAt))) current.latestActivityAt = values.createdAt;
      customers.set(key, current);
      return current;
    };
    storedCustomers.forEach((customer) => upsert(customer.email, customer));
    orders.forEach((order) => { const customer = upsert(order.customerEmail, { name: order.customerName, tenantId: order.tenantId, createdAt: order.createdAt }); customer.orderCount += 1; customer.paidCents += order.paymentStatus === 'PAID' ? order.totalCents : 0; customer.orders.push(order); });
    quotes.forEach((quote) => { const customer = upsert(quote.email, { name: quote.fullName, phone: quote.phone, tenantId: quote.tenantId, createdAt: quote.createdAt }); customer.quoteCount += 1; customer.quotes.push(quote); });
    return res.json(Array.from(customers.values()).sort((a, b) => new Date(b.latestActivityAt || 0) - new Date(a.latestActivityAt || 0)));
  } catch (error) {
    console.error('Customer directory error:', error);
    return res.status(500).json({ error: 'Failed to load customer directory' });
  }
});

export default router;
