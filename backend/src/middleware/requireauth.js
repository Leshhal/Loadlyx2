import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { hashConnectionValue } from '../services/locationPrivacy.js';

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET is missing from environment variables');
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT', 'TENANT_ADMIN'];
const PLATFORM_ROLES = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT'];
const PLATFORM_WRITE_ROLES = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'];
const PLATFORM_FINANCE_ROLES = ['SUPER_ADMIN', 'PLATFORM_ADMIN'];

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwtSecret);
    if (decoded.tokenType && decoded.tokenType !== 'access') return res.status(401).json({ error: 'Invalid token type' });
    const current = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, email: true, role: true, tenantId: true, isActive: true, tenant: { select: { isActive: true } } } });
    if (!current?.isActive || current.tenant?.isActive === false) return res.status(401).json({ error: 'Account or tenant is suspended' });
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const sessionHash = hashConnectionValue(token);
    const blocked = await prisma.securityBlock.findFirst({ where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], AND: [{ OR: [{ targetType: 'USER', userId: current.id }, { targetType: 'IP', targetValueHash: hashConnectionValue(ip) }, { targetType: 'SESSION', sessionHash }] }] } });
    if (blocked && current.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Access blocked by platform security policy' });
    req.user = { ...decoded, userId: current.id, email: current.email, role: current.role, tenantId: current.tenantId || null };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  return requireAuth(req, res, next);
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
}

export function requirePlatformRole(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!PLATFORM_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
}

export function requirePlatformWrite(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!PLATFORM_WRITE_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Platform write access required' });
  next();
}

export function requirePlatformFinance(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!PLATFORM_FINANCE_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Platform finance administrator required' });
  next();
}

export function requireTenantAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (PLATFORM_ROLES.includes(req.user.role)) return next();
  if (req.tenant?.id && req.user.tenantId === req.tenant.id) return next();
  return res.status(403).json({ error: 'Forbidden' });
}
