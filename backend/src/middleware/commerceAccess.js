import { prisma } from '../db/prisma.js';
import { optionalAuth } from './requireauth.js';
import { commerceCapabilityAllowed, publicStorefrontAvailable } from '../services/commerceAccess.js';

// Resolve the authenticated tenant independently of the customer storefront header.
export function requireCommerceCapability(capability) {
  return [optionalAuth, async (req, res, next) => {
    try {
      const tenant = req.user?.tenantId
        ? await prisma.tenant.findUnique({ where: { id: req.user.tenantId } })
        : req.tenant;
      if (tenant && !commerceCapabilityAllowed(tenant, capability)) {
        return res.status(403).json({ error: 'This module is not enabled for this business', code: 'CAPABILITY_REQUIRED', capability });
      }
      return next();
    } catch (error) { return next(error); }
  }];
}

export function requirePublishedStorefront(req, res, next) {
  if (req.tenant && !publicStorefrontAvailable(req.tenant)) {
    return res.status(404).json({ error: 'Storefront is not published', code: 'STOREFRONT_SETUP_REQUIRED' });
  }
  return next();
}
