import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';

const router = Router();

const carrierSchema = z.object({
  companyName: z.string().min(2),
  contactName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  serviceAreas: z.string().optional(),
  fleetSize: z.number().int().nonnegative().optional(),
  equipmentTypes: z.string().optional(),
  notes: z.string().optional()
});

router.post('/signup', async (req, res) => {
  const data = carrierSchema.parse(req.body);
  const profile = await prisma.carrierProfile.create({
    data: {
      tenantId: req.tenant.id,
      companyName: data.companyName,
      contactName: data.contactName || null,
      email: data.email,
      phone: data.phone || null,
      serviceAreas: data.serviceAreas || null,
      fleetSize: data.fleetSize ?? null,
      equipmentTypes: data.equipmentTypes || null,
      notes: data.notes || null,
      status: 'PENDING'
    }
  });

  res.status(201).json({
    success: true,
    message: 'Carrier profile received. We will contact you when the mover lead marketplace opens.',
    profile
  });
});

router.get('/public', async (req, res) => {
  const carriers = await prisma.carrierProfile.findMany({
    where: { tenantId: req.tenant.id, status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      companyName: true,
      serviceAreas: true,
      fleetSize: true,
      equipmentTypes: true,
      createdAt: true
    }
  });
  res.json(carriers);
});

export default router;
