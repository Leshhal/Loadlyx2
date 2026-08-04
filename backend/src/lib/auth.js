import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_DAYS = 30;
export const EMAIL_TOKEN_MINUTES = 60;
export const RESET_TOKEN_MINUTES = 30;

export const PLATFORM_ROLES = new Set(['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT']);
export const TENANT_ROLES = new Set(['TENANT_ADMIN', 'TENANT_STAFF', 'STAFF']);
export const MARKETPLACE_ROLES = new Set(['MARKETPLACE_USER', 'BROKER', 'CARRIER']);
export const ALL_ROLES = new Set([...PLATFORM_ROLES, ...TENANT_ROLES, ...MARKETPLACE_ROLES]);

export function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

export function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: user.tenant?.slug || null,
    emailVerifiedAt: user.emailVerifiedAt,
    isActive: user.isActive
  };
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenantId || null,
      role: user.role,
      email: user.email,
      tokenType: 'access'
    },
    env.jwtSecret,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

export function signAuthResponse(user) {
  return {
    token: signAccessToken(user),
    accessTokenExpiresIn: ACCESS_TOKEN_TTL,
    refreshTokenExpiresInDays: REFRESH_TOKEN_DAYS,
    tenantSlug: user.tenant?.slug || null,
    user: publicUser(user)
  };
}

export function createRawToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
