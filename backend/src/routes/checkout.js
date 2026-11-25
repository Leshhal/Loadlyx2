import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import orderRoutes from './orders.js';
import { legacyCheckoutHandler } from '../services/commerceCheckoutPolicy.js';

const router = Router();

// Older clients use the same tenant, provider, and pricing checks as storefront checkout.
router.post('/create-session', legacyCheckoutHandler({
  db: prisma,
  handleCheckout: (req, res, next) => orderRoutes.handle(req, res, next)
}));

export default router;
