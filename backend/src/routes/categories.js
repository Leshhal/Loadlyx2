import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { z } from 'zod';
import { requireAuth, requireTenantAccess } from '../middleware/requireauth.js';

const router = Router();

router.get('/', async (req, res) => {
  if (!req.tenant?.id) return res.status(400).json({ error: 'Tenant context required' });
  const categories = await prisma.category.findMany({
    where: { tenantId: req.tenant.id },
    include: { _count: { select: { products: true } } },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
  });
  res.json(categories);
});

router.post('/', requireAuth, requireTenantAccess, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    slug: z.string().min(2),
    description: z.string().optional(),
    imageUrl: z.string().url().optional(),
    icon: z.string().max(40).optional(),
    displayOrder: z.number().int().min(0).default(0),
    isEnabled: z.boolean().default(true)
  });
  const data = schema.parse(req.body);
  const category = await prisma.category.upsert({ where: { tenantId_slug: { tenantId: req.tenant.id, slug: data.slug } }, update: data, create: { ...data, tenantId: req.tenant.id } });
  res.status(201).json(category);
});

export default router;
