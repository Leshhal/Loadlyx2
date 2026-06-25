import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { z } from 'zod';

const router = Router();

router.get('/', async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { tenantId: req.tenant.id },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' }
  });
  res.json(categories);
});

router.post('/', async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    slug: z.string().min(2),
    description: z.string().optional()
  });
  const data = schema.parse(req.body);
  const category = await prisma.category.create({
    data: { ...data, tenantId: req.tenant.id }
  });
  res.status(201).json(category);
});

export default router;
