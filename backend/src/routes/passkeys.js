import { Router } from 'express';
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from '@simplewebauthn/server';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { createRawToken, daysFromNow, hashToken, normalizeEmail, REFRESH_TOKEN_DAYS, signAuthResponse } from '../lib/auth.js';
import { setRefreshCookie } from '../lib/authCookies.js';
import { requireAuth } from '../middleware/requireauth.js';

const router = Router();
const rpName = process.env.PASSKEY_RP_NAME || 'Loadlyx';
const rpId = process.env.PASSKEY_RP_ID || 'localhost';
const expectedOrigin = (process.env.PASSKEY_ORIGINS || process.env.PASSKEY_ORIGIN || 'http://localhost:3000').split(',').map((value) => value.trim()).filter(Boolean);
const expiresAt = () => new Date(Date.now() + 5 * 60 * 1000);

async function storeChallenge({ userId = null, email = null, challenge, purpose }) {
  await prisma.webAuthnChallenge.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { userId, purpose, consumedAt: null }] } });
  return prisma.webAuthnChallenge.create({ data: { userId, email, challenge, purpose, expiresAt: expiresAt() } });
}
async function consumeChallenge({ userId = null, email = null, challenge, purpose }) {
  const row = await prisma.webAuthnChallenge.findFirst({ where: { userId, email, challenge, purpose, consumedAt: null, expiresAt: { gt: new Date() } } });
  if (!row) throw new Error('Passkey challenge is invalid or expired');
  await prisma.webAuthnChallenge.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
  return row;
}
async function createRefreshToken(userId) {
  const raw = createRawToken(48);
  await prisma.authToken.create({ data: { userId, type: 'REFRESH_TOKEN', tokenHash: hashToken(raw), expiresAt: daysFromNow(REFRESH_TOKEN_DAYS) } });
  return raw;
}

router.post('/registration/options', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, include: { passkeys: true } });
    if (!user?.isActive) return res.status(401).json({ error: 'Active account required' });
    const options = await generateRegistrationOptions({ rpName, rpID: rpId, userName: user.email, userDisplayName: user.fullName || user.email, userID: new TextEncoder().encode(user.id), attestationType: 'none', excludeCredentials: user.passkeys.map((credential) => ({ id: credential.credentialId, transports: credential.transports || undefined })), authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' } });
    await storeChallenge({ userId: user.id, challenge: options.challenge, purpose: 'REGISTRATION' });
    return res.json(options);
  } catch (error) { return next(error); }
});

router.post('/registration/verify', requireAuth, async (req, res, next) => {
  try {
    const input = z.object({ name: z.string().min(1).max(80), response: z.record(z.any()) }).parse(req.body);
    const challenge = await prisma.webAuthnChallenge.findFirst({ where: { userId: req.user.userId, purpose: 'REGISTRATION', consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!challenge) return res.status(400).json({ error: 'Passkey challenge is invalid or expired' });
    const verification = await verifyRegistrationResponse({ response: input.response, expectedChallenge: challenge.challenge, expectedOrigin, expectedRPID: rpId, requireUserVerification: false });
    await consumeChallenge({ userId: req.user.userId, challenge: challenge.challenge, purpose: 'REGISTRATION' });
    if (!verification.verified || !verification.registrationInfo) return res.status(400).json({ error: 'Passkey registration could not be verified' });
    const credential = verification.registrationInfo.credential;
    const row = await prisma.$transaction(async (tx) => {
      const saved = await tx.passkeyCredential.create({ data: { userId: req.user.userId, credentialId: credential.id, publicKey: Buffer.from(credential.publicKey), counter: BigInt(credential.counter), transports: input.response.response?.transports || null, name: input.name, backedUp: Boolean(verification.registrationInfo.credentialBackedUp) } });
      await tx.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'PASSKEY_REGISTERED', entityType: 'PASSKEY', entityId: saved.id } });
      return saved;
    });
    return res.status(201).json({ id: row.id, name: row.name, createdAt: row.createdAt });
  } catch (error) { return next(error); }
});

router.post('/authentication/options', async (req, res, next) => {
  try {
    const email = normalizeEmail(z.string().email().parse(req.body?.email));
    const user = await prisma.user.findUnique({ where: { email }, include: { passkeys: true } });
    const options = await generateAuthenticationOptions({ rpID: rpId, userVerification: 'preferred', allowCredentials: user?.passkeys.map((credential) => ({ id: credential.credentialId, transports: credential.transports || undefined })) || [] });
    await storeChallenge({ userId: user?.id || null, email, challenge: options.challenge, purpose: 'AUTHENTICATION' });
    return res.json(options);
  } catch (error) { return next(error); }
});

router.post('/authentication/verify', async (req, res, next) => {
  try {
    const input = z.object({ email: z.string().email(), response: z.record(z.any()) }).parse(req.body);
    const email = normalizeEmail(input.email);
    const user = await prisma.user.findUnique({ where: { email }, include: { tenant: true, passkeys: true } });
    if (!user?.isActive) return res.status(401).json({ error: 'Passkey authentication failed' });
    const credential = user.passkeys.find((item) => item.credentialId === input.response.id);
    if (!credential) return res.status(401).json({ error: 'Passkey authentication failed' });
    const challenge = await prisma.webAuthnChallenge.findFirst({ where: { userId: user.id, email, purpose: 'AUTHENTICATION', consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!challenge) return res.status(400).json({ error: 'Passkey challenge is invalid or expired' });
    const verification = await verifyAuthenticationResponse({ response: input.response, expectedChallenge: challenge.challenge, expectedOrigin, expectedRPID: rpId, credential: { id: credential.credentialId, publicKey: new Uint8Array(credential.publicKey), counter: Number(credential.counter), transports: credential.transports || undefined }, requireUserVerification: false });
    await consumeChallenge({ userId: user.id, email, challenge: challenge.challenge, purpose: 'AUTHENTICATION' });
    if (!verification.verified) return res.status(401).json({ error: 'Passkey authentication failed' });
    const refreshToken = await createRefreshToken(user.id);
    await prisma.$transaction([prisma.passkeyCredential.update({ where: { id: credential.id }, data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() } }), prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }), prisma.auditEvent.create({ data: { actorUserId: user.id, action: 'PASSKEY_LOGIN', entityType: 'USER', entityId: user.id, tenantId: user.tenantId } })]);
    setRefreshCookie(res, refreshToken);
    return res.json({ message: 'Login successful', ...signAuthResponse(user) });
  } catch (error) { return next(error); }
});

router.get('/', requireAuth, async (req, res, next) => { try { return res.json(await prisma.passkeyCredential.findMany({ where: { userId: req.user.userId }, select: { id: true, name: true, backedUp: true, lastUsedAt: true, createdAt: true } })); } catch (error) { return next(error); } });
router.delete('/:id', requireAuth, async (req, res, next) => { try { const credential = await prisma.passkeyCredential.findFirst({ where: { id: req.params.id, userId: req.user.userId } }); if (!credential) return res.status(404).json({ error: 'Passkey not found' }); await prisma.$transaction([prisma.passkeyCredential.delete({ where: { id: credential.id } }), prisma.auditEvent.create({ data: { actorUserId: req.user.userId, action: 'PASSKEY_REMOVED', entityType: 'PASSKEY', entityId: credential.id } })]); return res.status(204).end(); } catch (error) { return next(error); } });

export default router;
