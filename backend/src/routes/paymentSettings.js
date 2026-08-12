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
    stripeStatus: settings.stripeStatus || (settings.stripeAccountId ? 'ONBOARDING_INCOMPLETE' : 'NOT_CONNECTED'),
    stripeChargesEnabled: Boolean(settings.stripeChargesEnabled),
    stripePayoutsEnabled: Boolean(settings.stripePayoutsEnabled),
    stripeRequirements: settings.stripeRequirements || [],
    stripeStatusUpdatedAt: settings.stripeStatusUpdatedAt || null,
    paypalMerchantId: settings.paypalMerchantId || '',
    paypalConnected: Boolean(settings.paypalMerchantId),
    payoutMethod: settings.payoutMethod || '',
    payoutDestinationLabel: settings.payoutDestinationLabel || ''
  };
}

async function refreshStripeState(tenantId, tenant) {
  const branding = tenant?.brandingJson && typeof tenant.brandingJson === 'object' ? tenant.brandingJson : {};
  const current = branding.paymentSettings && typeof branding.paymentSettings === 'object' ? branding.paymentSettings : {};
  if (!stripe || !current.stripeAccountId) return current;
  try {
    const account = await stripe.accounts.retrieve(current.stripeAccountId);
    const requirements = [...(account.requirements?.currently_due || []), ...(account.requirements?.past_due || [])];
    const status = account.charges_enabled && account.payouts_enabled ? 'CONNECTED' : account.requirements?.disabled_reason ? 'RESTRICTED' : requirements.length ? 'REQUIREMENTS_DUE' : 'ONBOARDING_INCOMPLETE';
    const updated = { ...current, stripeStatus: status, stripeChargesEnabled: Boolean(account.charges_enabled), stripePayoutsEnabled: Boolean(account.payouts_enabled), stripeRequirements: [...new Set(requirements)], stripeStatusUpdatedAt: new Date().toISOString() };
    await prisma.tenant.update({ where: { id: tenantId }, data: { brandingJson: { ...branding, paymentSettings: updated } } });
    return updated;
  } catch {
    const updated = { ...current, stripeStatus: 'ERROR', stripeStatusUpdatedAt: new Date().toISOString() };
    await prisma.tenant.update({ where: { id: tenantId }, data: { brandingJson: { ...branding, paymentSettings: updated } } });
    return updated;
  }
}

router.get('/', async (req, res) => {
  if (!req.user?.tenantId && ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT'].includes(req.user?.role)) {
    return res.json({ scope: 'PLATFORM', providers: {
      stripe: { status: !stripe ? 'CONFIGURATION REQUIRED' : env.stripeSecretKey.startsWith('sk_live_') ? 'CONFIGURED' : 'SANDBOX', connectMode: 'EXPRESS', webhookConfigured: Boolean(env.stripeWebhookSecret), liveVerified: false },
      paypal: { status: process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? (process.env.PAYPAL_MODE === 'LIVE' ? 'LIVE_EXTERNAL_VERIFICATION_REQUIRED' : 'SANDBOX_EXTERNAL_VERIFICATION_REQUIRED') : 'DISABLED', mode: 'MULTIPARTY' },
      crypto: { status: process.env.CRYPTO_PROVIDER && process.env.CRYPTO_PROVIDER !== 'MOCK' ? 'SANDBOX_OR_LIVE_EXTERNAL_VERIFICATION_REQUIRED' : 'MOCK', provider: process.env.CRYPTO_PROVIDER || 'MOCK' }
    } });
  }
  const tenantId = tenantRequired(req, res); if (!tenantId) return;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { brandingJson: true } });
  const settings = await refreshStripeState(tenantId, tenant);
  return res.json({ scope: 'TENANT', settings: publicSettings({ paymentSettings: settings }), stripeAvailable: Boolean(stripe), paypalMode: process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? 'partner-configuration-required' : 'configuration-required' });
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

router.post('/stripe/status', async (req, res) => {
  const tenantId = tenantRequired(req, res); if (!tenantId) return;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { brandingJson: true } });
  const settings = await refreshStripeState(tenantId, tenant);
  return res.json({ settings: publicSettings({ paymentSettings: settings }) });
});

export default router;
