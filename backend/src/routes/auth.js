import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import {
  ALL_ROLES,
  EMAIL_TOKEN_MINUTES,
  PLATFORM_ROLES,
  REFRESH_TOKEN_DAYS,
  RESET_TOKEN_MINUTES,
  TENANT_ROLES,
  createRawToken,
  daysFromNow,
  hashToken,
  minutesFromNow,
  normalizeEmail,
  publicUser,
  signAuthResponse
} from '../lib/auth.js';
import { requireAuth } from '../middleware/requireauth.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService.js';
import { validateTenantSlug } from '../lib/tenantSlug.js';
import { clearRefreshCookie, readCookie, setRefreshCookie } from '../lib/authCookies.js';
import { SUBSCRIPTION_PLANS } from '../config/plans.js';
import { publishEvent } from '../services/eventBus.js';
import { authorizationUrl, exchangeOAuthCode, oauthConfig, oauthReadiness, requireVerifiedOAuthIdentity } from '../services/oauthService.js';

const router = Router();
const OAUTH_PROVIDER_KEYS = ['google', 'apple', 'discord'];

function assertJwtSecret() {
  if (!env.jwtSecret) throw new Error('JWT_SECRET is missing from environment variables');
}

async function createToken(userId, type, minutes) {
  const raw = createRawToken();
  await prisma.authToken.create({
    data: { userId, type, tokenHash: hashToken(raw), expiresAt: minutesFromNow(minutes) }
  });
  return raw;
}

async function createRefreshToken(userId) {
  const raw = createRawToken(48);
  await prisma.authToken.create({
    data: { userId, type: 'REFRESH_TOKEN', tokenHash: hashToken(raw), expiresAt: daysFromNow(REFRESH_TOKEN_DAYS) }
  });
  return raw;
}

function resolveRequestedRole(role, tenantSlug) {
  const requested = String(role || '').trim().toUpperCase();
  if (!requested) return tenantSlug ? 'TENANT_ADMIN' : 'MARKETPLACE_USER';
  if (!ALL_ROLES.has(requested)) return null;
  if (PLATFORM_ROLES.has(requested)) return null;
  if (TENANT_ROLES.has(requested) && (!tenantSlug || requested !== 'TENANT_ADMIN')) return null;
  return requested;
}

async function handleSignup(req, res) {
  try {
    assertJwtSecret();
    const { fullName, password, tenantSlug, companyName, acceptedTerms } = req.body;
    const email = normalizeEmail(req.body.email);
    const role = resolveRequestedRole(req.body.role, tenantSlug);

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (!fullName?.trim()) return res.status(400).json({ error: 'Full name is required' });
    if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (acceptedTerms !== true) return res.status(400).json({ error: 'Terms must be accepted' });
    if (!role) return res.status(400).json({ error: 'Requested role is not allowed for self signup' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    let user;
    if (role === 'TENANT_ADMIN') {
      const validation = validateTenantSlug(tenantSlug);
      if (!validation.ok) return res.status(400).json({ error: validation.error });
      if (!companyName?.trim()) return res.status(400).json({ error: 'Company name is required for tenant signup' });
      const conflict = await prisma.tenant.findFirst({
        where: { OR: [{ slug: validation.slug }, { subdomain: validation.slug }] },
        select: { id: true }
      });
      if (conflict) return res.status(409).json({ error: 'Tenant slug is unavailable' });

      user = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: companyName.trim(),
            slug: validation.slug,
            subdomain: validation.slug,
            email,
            subscriptionPlan: 'starter',
            brandingJson: { theme: 'default', tenantPages: [] }
          }
        });
        const owner = await tx.user.create({
          data: { fullName: fullName.trim(), email, passwordHash, tenantId: tenant.id, role },
          include: { tenant: true }
        });
        await Promise.all([
          tx.commissionPolicy.create({ data: { scopeKey: `TENANT:${tenant.id}`, tenantId: tenant.id, storeCommissionBps: SUBSCRIPTION_PLANS.STARTER.commissionBps, marketplaceCommissionBps: SUBSCRIPTION_PLANS.STARTER.commissionBps } }),
          tx.subscription.create({ data: { tenantId: tenant.id, planCode: 'STARTER', status: 'TRIALING', monthlyPriceCents: SUBSCRIPTION_PLANS.STARTER.monthlyPriceCents, currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 14 * 86400000) } }),
          tx.aiTenantConfig.create({ data: { tenantId: tenant.id, enabled: false, monthlyRequestLimit: 100, allowedModules: [] } }),
          tx.simulationConfig.create({ data: { scopeKey: `TENANT:${tenant.id}`, tenantId: tenant.id, enabled: false, businessHours: {} } }),
          tx.auditEvent.create({ data: { actorUserId: owner.id, action: 'TENANT_PROVISIONED', entityType: 'TENANT', entityId: tenant.id, tenantId: tenant.id, afterJson: { slug: tenant.slug, role: owner.role, plan: 'STARTER', trialDays: 14 } } })
        ]);
        return owner;
      });
    } else {
      user = await prisma.user.create({
        data: { fullName: fullName.trim(), email, passwordHash, role },
        include: { tenant: true }
      });
    }
    const verificationToken = await createToken(user.id, 'EMAIL_VERIFICATION', EMAIL_TOKEN_MINUTES);
    const delivery = await sendVerificationEmail(user, verificationToken);
    await publishEvent({ tenantId: user.tenantId || null, eventType: 'user.created', aggregateType: 'USER', aggregateId: user.id, payload: { role: user.role, emailVerified: false }, metadata: { actorUserId: user.id }, idempotencyKey: `user.created:${user.id}` });
    if (user.tenantId) await publishEvent({ tenantId: user.tenantId, eventType: 'tenant.created', aggregateType: 'TENANT', aggregateId: user.tenantId, payload: { slug: user.tenant.slug, ownerUserId: user.id }, metadata: { actorUserId: user.id }, idempotencyKey: `tenant.created:${user.tenantId}` });

    return res.status(201).json({
      message: 'Signup successful. Check your email to verify the account.',
      emailDelivered: delivery.delivered,
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Failed to create account' });
  }
}

router.post('/signup', handleSignup);
router.post('/register', handleSignup);

router.post('/login', async (req, res) => {
  try {
    assertJwtSecret();
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await prisma.user.findUnique({ where: { email }, include: { tenant: true } });
    if (!user || user.isActive === false || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.emailVerifiedAt) return res.status(403).json({ error: 'Verify your email before signing in' });

    const refreshToken = await createRefreshToken(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    setRefreshCookie(res, refreshToken);
    return res.json({ message: 'Login successful', ...signAuthResponse(user) });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    assertJwtSecret();
    const raw = readCookie(req) || req.body.refreshToken;
    if (!raw) return res.status(400).json({ error: 'Refresh token is required' });
    const stored = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(raw) }, include: { user: { include: { tenant: true } } } });
    if (!stored || stored.type !== 'REFRESH_TOKEN' || stored.consumedAt || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    await prisma.authToken.update({ where: { id: stored.id }, data: { consumedAt: new Date() } });
    const refreshToken = await createRefreshToken(stored.userId);
    setRefreshCookie(res, refreshToken);
    return res.json(signAuthResponse(stored.user));
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ error: 'Failed to refresh session' });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  const raw = readCookie(req) || req.body.refreshToken;
  if (raw) await prisma.authToken.updateMany({ where: { tokenHash: hashToken(raw), type: 'REFRESH_TOKEN' }, data: { consumedAt: new Date() } });
  clearRefreshCookie(res);
  return res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, include: { tenant: true } });
  if (!user || !user.isActive) return res.status(401).json({ error: 'Unauthorized' });
  return res.json({ user: publicUser(user) });
});

router.post('/forgot-password', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const resetToken = await createToken(user.id, 'PASSWORD_RESET', RESET_TOKEN_MINUTES);
      await sendPasswordResetEmail(user, resetToken);
    }
  }
  return res.json({ message: 'If the account exists, reset instructions have been sent.' });
});

router.post('/resend-verification', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerifiedAt && user.isActive) {
      await prisma.authToken.updateMany({
        where: { userId: user.id, type: 'EMAIL_VERIFICATION', consumedAt: null },
        data: { consumedAt: new Date() }
      });
      const verificationToken = await createToken(user.id, 'EMAIL_VERIFICATION', EMAIL_TOKEN_MINUTES);
      await sendVerificationEmail(user, verificationToken);
    }
  }
  return res.json({ message: 'If the account requires verification, a new email has been sent.' });
});

router.get('/tenant-slug/:slug/availability', async (req, res) => {
  const validation = validateTenantSlug(req.params.slug);
  if (!validation.ok) return res.json({ available: false, slug: validation.slug, reason: validation.error });
  const existing = await prisma.tenant.findFirst({
    where: { OR: [{ slug: validation.slug }, { subdomain: validation.slug }] },
    select: { id: true }
  });
  return res.json({ available: !existing, slug: validation.slug });
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const stored = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!stored || stored.type !== 'PASSWORD_RESET' || stored.consumedAt || stored.expiresAt < new Date()) return res.status(400).json({ error: 'Invalid or expired reset token' });
  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
    prisma.authToken.update({ where: { id: stored.id }, data: { consumedAt: new Date() } }),
    prisma.authToken.updateMany({ where: { userId: stored.userId, type: 'REFRESH_TOKEN', consumedAt: null }, data: { consumedAt: new Date() } })
  ]);
  return res.json({ message: 'Password reset successful' });
});

router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Verification token is required' });
  const stored = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!stored || stored.type !== 'EMAIL_VERIFICATION' || stored.consumedAt || stored.expiresAt < new Date()) return res.status(400).json({ error: 'Invalid or expired verification token' });
  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.authToken.update({ where: { id: stored.id }, data: { consumedAt: new Date() } }),
    prisma.auditEvent.create({ data: { actorUserId: stored.userId, action: 'EMAIL_VERIFIED', entityType: 'USER', entityId: stored.userId } })
  ]);
  const verified = await prisma.user.findUnique({ where: { id: stored.userId } });
  await publishEvent({ tenantId: verified?.tenantId || null, eventType: 'user.verified', aggregateType: 'USER', aggregateId: stored.userId, payload: { verified: true }, metadata: { actorUserId: stored.userId }, idempotencyKey: `user.verified:${stored.userId}` });
  return res.json({ message: 'Email verified successfully' });
});

router.get('/oauth/providers', (_req, res) => {
  const providers = OAUTH_PROVIDER_KEYS.map((key) => { const readiness = oauthReadiness(key); return { key, configured: readiness.configured, available: readiness.configured, reason: readiness.configured ? null : `Missing ${readiness.missing.join(', ')}` }; });
  return res.json({ providers });
});

router.get('/oauth/:provider/start', async (req, res, next) => {
  try {
  const provider = String(req.params.provider || '').toLowerCase();
  const config = oauthConfig(provider);
  if (!config) return res.status(404).json({ error: 'OAuth provider not supported' });
  const readiness = oauthReadiness(provider);
  if (!readiness.configured) return res.status(503).json({ error: `${provider} login is not configured`, missing: readiness.missing });
  const state = createRawToken(32);
  const nonce = ['apple','google'].includes(provider) ? createRawToken(32) : null;
  await prisma.oauthState.create({ data: { tokenHash: hashToken(state), nonce, provider, expiresAt: minutesFromNow(10) } });
  return res.redirect(authorizationUrl(config, state, nonce));
  } catch (error) { return next(error); }
});

async function oauthCallback(req, res) {
  const provider = String(req.params.provider || '').toLowerCase();
  const config = oauthConfig(provider);
  const code = String(req.body?.code || req.query?.code || '');
  const state = String(req.body?.state || req.query?.state || '');
  const frontend = String(env.frontendUrl || 'http://localhost:3000').replace(/\/$/, '');
  try {
    if (!config || !code || !state) throw new Error('OAuth callback is incomplete');
    const storedState = await prisma.oauthState.findUnique({ where: { tokenHash: hashToken(state) } });
    if (!storedState || storedState.provider !== provider || storedState.consumedAt || storedState.expiresAt < new Date()) throw new Error('OAuth state is invalid or expired');
    await prisma.oauthState.update({ where: { id: storedState.id }, data: { consumedAt: new Date() } });
    const profile = await exchangeOAuthCode(config, code, storedState.nonce || null);
    let account = await prisma.oauthAccount.findUnique({ where: { provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId } }, include: { user: { include: { tenant: true } } } });
    let user = account?.user || null;
    if (!account) requireVerifiedOAuthIdentity(profile);
    if (!user) user = await prisma.user.findUnique({ where: { email: normalizeEmail(profile.email) }, include: { tenant: true } });
    if (!user) {
      user = await prisma.user.create({ data: { email: normalizeEmail(profile.email), fullName: profile.name || 'Marketplace user', role: 'MARKETPLACE_USER', emailVerifiedAt: new Date() }, include: { tenant: true } });
    }
    if (!account) await prisma.oauthAccount.create({ data: { userId: user.id, provider, providerAccountId: profile.providerAccountId } });
    if (!user.emailVerifiedAt && profile.emailVerified) user = await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() }, include: { tenant: true } });
    const refreshToken = await createRefreshToken(user.id);
    setRefreshCookie(res, refreshToken);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return res.redirect(`${frontend}/oauth/callback`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.redirect(`${frontend}/login?oauth_error=${encodeURIComponent(error.message || 'OAuth sign-in failed')}`);
  }
}

router.get('/oauth/:provider/callback', oauthCallback);
router.post('/oauth/:provider/callback', oauthCallback);

export default router;
