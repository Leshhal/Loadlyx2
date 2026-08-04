import { prisma } from '../db/prisma.js';
import { getSubscriptionPlan } from '../config/plans.js';

const PLATFORM_ROLES = new Set(['SUPER_ADMIN','PLATFORM_ADMIN','ADMIN','SUPPORT']);

export function requireEntitlement(feature) {
  return async function entitlementMiddleware(req, res, next) {
    try {
      if (PLATFORM_ROLES.has(req.user?.role)) return next();
      if (!req.user?.tenantId && req.user?.role === 'MARKETPLACE_USER' && feature === 'ai') return next();
      if (!req.user?.tenantId) return res.status(403).json({ error: 'Tenant subscription required', code: 'TENANT_REQUIRED' });
      const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId }, select: { subscriptionPlan: true, subscription: { select: { planCode: true, status: true } } } });
      const code = String(tenant?.subscription?.planCode || tenant?.subscriptionPlan || 'STARTER').toUpperCase();
      const stored = await prisma.subscriptionPlan.findUnique({ where: { code } });
      const entitlements = stored?.entitlementsJson || getSubscriptionPlan(code)?.entitlements || getSubscriptionPlan('STARTER').entitlements;
      if (!entitlements?.[feature]) return res.status(403).json({ error: `${feature} is not included in the current plan`, code: 'ENTITLEMENT_REQUIRED', feature, planCode: code });
      req.entitlements = entitlements;
      return next();
    } catch (error) { return next(error); }
  };
}
