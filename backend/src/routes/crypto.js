import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db/prisma.js';
import { requireAuth, requirePlatformRole } from '../middleware/requireauth.js';
import { createCryptoProvider, nextCryptoStatus, SUPPORTED_ASSETS, verifyCryptoWebhook } from '../services/cryptoService.js';
import { recordStoreSettlement } from '../services/ledgerService.js';
import { requireFeature } from '../services/featureFlagService.js';

const router = Router();
const checkoutSchema = z.object({ productSlug: z.string().min(1), quantity: z.number().int().min(1).max(100), asset: z.enum(['BTC','ETH','SOL','ADA','USDC','USDT']), name: z.string().min(1).max(200), email: z.string().email(), country: z.string().max(2).default('CA'), province: z.string().max(100).optional(), address: z.string().max(300).optional(), city: z.string().max(120).optional(), postalCode: z.string().max(30).optional() });

router.post('/invoices', async (req, res, next) => {
  try {
    const input = checkoutSchema.parse(req.body);
    const tenantSlug = String(req.headers['x-tenant-slug'] || '').toLowerCase();
    const tenant = await prisma.tenant.findFirst({ where: { OR: [{ slug: tenantSlug }, { subdomain: tenantSlug }], isActive: true }, include: { cryptoSettings: true } });
    if (tenant) await requireFeature(prisma, 'crypto-checkout', tenant.id);
    if (!tenant?.cryptoSettings?.enabled) return res.status(503).json({ error: 'Crypto checkout is not enabled for this store' });
    const accepted = tenant.cryptoSettings.acceptedAssets || [];
    if (!accepted.includes(input.asset)) return res.status(400).json({ error: 'Asset is not accepted by this store' });
    const product = await prisma.product.findFirst({ where: { tenantId: tenant.id, slug: input.productSlug, isActive: true } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const totalCents = product.priceCents * input.quantity;
    const order = await prisma.order.create({ data: { tenantId: tenant.id, customerEmail: input.email, customerName: input.name, status: 'PENDING', paymentStatus: 'PENDING', currency: 'cad', subtotalCents: totalCents, shippingCents: 0, totalCents, shippingCountry: input.country, shippingProvince: input.province || null, shippingAddressJson: { address: input.address, city: input.city, province: input.province, postalCode: input.postalCode, country: input.country }, items: { create: [{ productId: product.id, productName: product.name, sku: product.sku, quantity: input.quantity, unitPriceCents: product.priceCents }] } } });
    const provider = createCryptoProvider(tenant.cryptoSettings.provider);
    const created = await provider.createInvoice({ orderId: order.id, asset: input.asset, fiatAmountCents: totalCents, expiryMinutes: tenant.cryptoSettings.invoiceExpiryMinutes });
    const invoice = await prisma.cryptoInvoice.create({ data: { tenantId: tenant.id, orderId: order.id, provider: provider.name, providerInvoiceId: created.providerInvoiceId, asset: input.asset, chain: SUPPORTED_ASSETS[input.asset], fiatCurrency: 'cad', fiatAmountCents: totalCents, cryptoAmount: String(created.cryptoAmount), exchangeRate: String(created.exchangeRate), paymentAddress: created.paymentAddress, qrPayload: created.qrPayload, requiredConfirmations: tenant.cryptoSettings.requiredConfirmations, status: 'AWAITING_PAYMENT', expiresAt: created.expiresAt } });
    return res.status(201).json(invoice);
  } catch (error) { return next(error); }
});

router.get('/invoices/:id', async (req, res, next) => { try { const invoice = await prisma.cryptoInvoice.findUnique({ where: { id: req.params.id } }); if (!invoice) return res.status(404).json({ error: 'Invoice not found' }); const status = nextCryptoStatus({ expectedAmount: invoice.cryptoAmount, receivedAmount: invoice.amountReceived, confirmations: invoice.confirmations, requiredConfirmations: invoice.requiredConfirmations, expired: invoice.expiresAt < new Date() }); if (status !== invoice.status && !['PAID','REFUNDED'].includes(invoice.status)) return res.json(await prisma.cryptoInvoice.update({ where: { id: invoice.id }, data: { status } })); return res.json(invoice); } catch (error) { return next(error); } });

router.post('/webhooks/:provider', async (req, res, next) => {
  try {
    const provider = req.params.provider.toUpperCase();
    const rawPayload = JSON.stringify(req.body);
    if (!verifyCryptoWebhook({ rawPayload, signature: req.headers['x-crypto-signature'], secret: process.env.CRYPTO_WEBHOOK_SECRET })) return res.status(401).json({ error: 'Invalid webhook signature' });
    const input = z.object({ eventId: z.string(), providerInvoiceId: z.string(), amountReceived: z.number().nonnegative(), confirmations: z.number().int().nonnegative(), transactionHash: z.string().optional() }).parse(req.body);
    const existingEvent = await prisma.cryptoWebhookEvent.findUnique({ where: { provider_providerEventId: { provider, providerEventId: input.eventId } } });
    if (existingEvent) return res.json({ duplicate: true });
    const invoice = await prisma.cryptoInvoice.findUnique({ where: { providerInvoiceId: input.providerInvoiceId }, include: { order: true } });
    if (!invoice || invoice.provider !== provider) return res.status(404).json({ error: 'Invoice not found' });
    const status = nextCryptoStatus({ expectedAmount: invoice.cryptoAmount, receivedAmount: input.amountReceived, confirmations: input.confirmations, requiredConfirmations: invoice.requiredConfirmations, expired: invoice.expiresAt < new Date() });
    await prisma.$transaction(async (tx) => {
      await tx.cryptoWebhookEvent.create({ data: { provider, providerEventId: input.eventId, invoiceId: invoice.id, payloadHash: crypto.createHash('sha256').update(rawPayload).digest('hex') } });
      await tx.cryptoInvoice.update({ where: { id: invoice.id }, data: { amountReceived: String(input.amountReceived), confirmations: input.confirmations, transactionHash: input.transactionHash, status, paidAt: status === 'PAID' || status === 'OVERPAID' ? new Date() : null } });
      if (status === 'PAID' || status === 'OVERPAID') {
        await tx.order.update({ where: { id: invoice.orderId }, data: { status: 'PAID', paymentStatus: 'PAID' } });
        await recordStoreSettlement(tx, { tenantId: invoice.tenantId, orderId: invoice.orderId, grossCents: invoice.fiatAmountCents, taxCents: 0, processorFeeCents: 0, currency: invoice.fiatCurrency, source: `crypto:${provider}`, idempotencyKey: `crypto-settlement:${invoice.id}` });
      }
    });
    return res.json({ status });
  } catch (error) { return next(error); }
});

router.get('/settings', requireAuth, async (req, res, next) => { try { if (!req.user.tenantId) return res.status(403).json({ error: 'Tenant required' }); return res.json(await prisma.cryptoPaymentSettings.findUnique({ where: { tenantId: req.user.tenantId } })); } catch (error) { return next(error); } });
router.put('/settings', requireAuth, async (req, res, next) => {
  try {
    if (!req.user.tenantId || !['TENANT_ADMIN','SUPER_ADMIN','PLATFORM_ADMIN','ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Tenant Admin required' });
    const input = z.object({ enabled: z.boolean(), provider: z.enum(['MOCK']), acceptedAssets: z.array(z.enum(['BTC','ETH','SOL','ADA','USDC','USDT'])).min(1), requiredConfirmations: z.number().int().min(1).max(100), invoiceExpiryMinutes: z.number().int().min(5).max(1440) }).parse(req.body);
    if (input.enabled) await requireFeature(prisma, 'crypto-checkout', req.user.tenantId);
    return res.json(await prisma.cryptoPaymentSettings.upsert({ where: { tenantId: req.user.tenantId }, update: input, create: { tenantId: req.user.tenantId, ...input } }));
  } catch (error) { return next(error); }
});
router.get('/admin/invoices', requireAuth, requirePlatformRole, async (_req, res, next) => { try { return res.json(await prisma.cryptoInvoice.findMany({ include: { tenant: { select: { name: true, slug: true } }, order: { select: { customerEmail: true, status: true } } }, orderBy: { createdAt: 'desc' }, take: 500 })); } catch (error) { return next(error); } });

export default router;
