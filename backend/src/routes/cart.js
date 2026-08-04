import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { optionalAuth } from '../middleware/requireauth.js';

const router = Router();
router.use(optionalAuth);

function identity(req) {
  const tenantId = req.tenant?.id || req.user?.tenantId;
  const sessionKey = String(req.headers['x-cart-session'] || '').trim();
  if (!tenantId) throw Object.assign(new Error('Tenant context required'), { statusCode: 400 });
  if (!req.user && sessionKey.length < 12) throw Object.assign(new Error('A cart session key is required'), { statusCode: 400 });
  return { tenantId, userId: req.user?.userId || null, sessionKey: req.user ? null : sessionKey };
}

async function cartFor(req, create = false) {
  const owner = identity(req);
  const where = owner.userId ? { tenantId_userId: { tenantId: owner.tenantId, userId: owner.userId } } : { tenantId_sessionKey: { tenantId: owner.tenantId, sessionKey: owner.sessionKey } };
  const include = { items: { orderBy: { createdAt: 'asc' } } };
  const existing = await prisma.storeCart.findUnique({ where, include });
  if (existing || !create) return existing;
  return prisma.storeCart.create({ data: { ...owner, expiresAt: owner.userId ? null : new Date(Date.now() + 30 * 86400000) }, include });
}

router.get('/', async (req, res, next) => { try { return res.json(await cartFor(req, false) || { items: [] }); } catch (error) { return next(error); } });
router.put('/items', async (req, res, next) => {
  try {
    const input = z.object({ productId: z.string().min(1), variantId: z.string().optional().nullable(), quantity: z.number().int().min(0).max(999) }).parse(req.body);
    const cart = await cartFor(req, true);
    const product = await prisma.product.findFirst({ where: { id: input.productId, tenantId: cart.tenantId, publicationStatus: 'ACTIVE' }, include: { variants: true } });
    if (!product) return res.status(404).json({ error: 'Product is not available for this tenant' });
    if (input.variantId && !product.variants.some((variant) => variant.id === input.variantId && variant.isActive)) return res.status(400).json({ error: 'Variant is not available' });
    const key = { cartId_productId_variantId: { cartId: cart.id, productId: input.productId, variantId: input.variantId || null } };
    if (input.quantity === 0) await prisma.storeCartItem.deleteMany({ where: key.cartId_productId_variantId });
    else await prisma.storeCartItem.upsert({ where: key, update: { quantity: input.quantity }, create: { cartId: cart.id, ...input, variantId: input.variantId || null } });
    return res.json(await prisma.storeCart.findUnique({ where: { id: cart.id }, include: { items: { orderBy: { createdAt: 'asc' } } } }));
  } catch (error) { return next(error); }
});
router.delete('/', async (req, res, next) => { try { const cart = await cartFor(req, false); if (cart) await prisma.storeCart.delete({ where: { id: cart.id } }); return res.status(204).end(); } catch (error) { return next(error); } });

export default router;
