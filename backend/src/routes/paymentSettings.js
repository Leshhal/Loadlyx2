import { Router } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';

const router = Router();
const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

function tenantRequired(req, res) {
  if (!req.user?.tenantId) { res.status(403).json({ error: 'Select or sign in to a tenant account to configure payouts' }); return null; }
  return req.user.tenantId;
}

function publicSettings(brandingJson = {}) {
  const settings = brandingJson?.paymentSettings || {};
  return {
    stripeAccountId: settings.stripeAccountId || null,
    stripeConnected: Boolean(settings.stripeAccountId),
    paypalMerchantId: settings.paypalMerchantId || '',
    paypalConnected: Boolean(settings.paypalMerchantId),
    payoutMethod: settings.payoutMethod || '',
    payoutDestinationLabel: settings.payoutDestinationLabel || ''
  };
}

router.get('/', async (req, res) => {
  if (!req.user?.tenantId && ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT'].includes(req.user?.role)) {
    return res.json({ scope: 'PLATFORM', providers: {
      stripe: { status: !stripe ? 'DISABLED' : env.stripeSecretKey.startsWith('sk_live_') ? 'LIVE' : 'SANDBOX', connectMode: 'EXPRESS', webhookConfigured: Boolean(env.stripeWebhookSecret) },
      paypal: { status: process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? (process.env.PAYPAL_MODE === 'LIVE' ? 'LIVE_EXTERNAL_VERIFICATION_REQUIRED' : 'SANDBOX_EXTERNAL_VERIFICATION_REQUIRED') : 'DISABLED', mode: 'MULTIPARTY' },
      crypto: { status: process.env.CRYPTO_PROVIDER && process.env.CRYPTO_PROVIDER !== 'MOCK' ? 'SANDBOX_OR_LIVE_EXTERNAL_VERIFICATION_REQUIRED' : 'MOCK', provider: process.env.CRYPTO_PROVIDER || 'MOCK' }
    } });
  }
  const tenantId = tenantRequired(req, res); if (!tenantId) return;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { brandingJson: true } });
  return res.json({ scope: 'TENANT', settings: publicSettings(tenant?.brandingJson), stripeAvailable: Boolean(stripe), paypalMode: process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? 'multiparty-ready' : 'merchant-id-only' });
});

router.put('/', async (req, res) => {
  const tenantId = tenantRequired(req, res); if (!tenantId) return;
  const input = z.object({ paypalMerchantId: z.string().trim().max(160).optional(), payoutMethod: z.enum(['STRIPE', 'PAYPAL', 'MANUAL']).optional(), payoutDestinationLabel: z.string().trim().max(160).optional() }).parse(req.body);
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { brandingJson: true } });
  const branding = tenant?.brandingJson && typeof tenant.brandingJson === 'object' ? tenant.brandingJson : {};
  const current = branding.paymentSettings && typeof branding.paymentSettings === 'object' ? branding.paymentSettings : {};
  const updated = { ...current, ...input };
  await prisma.tenant.update({ where: { id: tenantId }, data: { brandingJson: { ...branding, paymentSettings: updated } } });
  return res.json({ settings: publicSettings({ paymentSettings: updated }) });
});

router.post('/stripe/onboarding', async (req, res) => {
  const tenantId = tenantRequired(req, res); if (!tenantId) return;
  if (!stripe) return res.status(503).json({ error: 'The platform Stripe account is not configured yet' });
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, email: true, brandingJson: true } });
  const branding = tenant?.brandingJson && typeof tenant.brandingJson === 'object' ? tenant.brandingJson : {};
  const current = branding.paymentSettings && typeof branding.paymentSettings === 'object' ? branding.paymentSettings : {};
  const accountId = current.stripeAccountId || (await stripe.accounts.create({ type: 'express', email: tenant?.email || undefined, business_profile: { name: tenant?.name || undefined }, metadata: { tenantId } })).id;
  if (!current.stripeAccountId) await prisma.tenant.update({ where: { id: tenantId }, data: { brandingJson: { ...branding, paymentSettings: { ...current, stripeAccountId: accountId, payoutMethod: current.payoutMethod || 'STRIPE' } } } });
  const base = env.frontendUrl;
  const link = await stripe.accountLinks.create({ account: accountId, type: 'account_onboarding', refresh_url: `${base}/admin/payments?stripe=refresh`, return_url: `${base}/admin/payments?stripe=complete` });
  return res.json({ url: link.url });
});

export default router;
