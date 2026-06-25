import { resolveTenant } from '../lib/tenant.js';
import { Router } from 'express';
import { prisma } from '../db/prisma.js';

const router = Router();

function buildPublicTitle(load) {
  const bedrooms = load.quote?.bedrooms ? `${load.quote.bedrooms} bedroom move` : 'Moving load';
  return `${bedrooms}: ${load.originCity} to ${load.destinationCity}`;
}

function serializePublicLoad(load) {
  return {
    id: load.id,
    title: buildPublicTitle(load),
    route: `${load.originCity} → ${load.destinationCity}`,
    status: load.status,
    originCity: load.originCity,
    originProvince: load.originProvince,
    originState: load.originState,
    originCountry: load.originCountry,
    destinationCity: load.destinationCity,
    destinationProvince: load.destinationProvince,
    destinationState: load.destinationState,
    destinationCountry: load.destinationCountry,
    pickupDate: load.pickupDate,
    estimatedWeightKg: load.estimatedWeightKg,
    estimatedVolume: load.estimatedVolume,
    equipmentType: load.equipmentType,
    summary: load.notes || load.quote?.comments || null,
    bedrooms: load.quote?.bedrooms || null,
    createdAt: load.createdAt,
    publicLeadCta: 'Create a carrier profile to request access to this lead.'
  };
}

router.get('/', async (req, res) => {
try {
const tenant = await resolveTenant(req);

const loads = await prisma.load.findMany({
where: { tenantId: tenant.id },
include: { quote: true },
orderBy: { createdAt: 'desc' }
});

res.json(loads.map(serializePublicLoad));
} catch (error) {
console.error('Error fetching loads:', error);
res.status(500).json({ error: 'Failed to fetch loads' });
}
});

router.get('/public', async (req, res) => {
  const loads = await prisma.load.findMany({
    where: {
      tenantId: req.tenant.id,
      status: { in: ['PENDING', 'POSTED'] }
    },
    include: { quote: true },
    orderBy: [{ pickupDate: 'asc' }, { createdAt: 'desc' }],
    take: 50
  });
  res.json(loads.map(serializePublicLoad));
});

router.get('/public/:id', async (req, res) => {
  const load = await prisma.load.findFirst({
    where: {
      id: req.params.id,
      tenantId: req.tenant.id,
      status: { in: ['PENDING', 'POSTED'] }
    },
    include: { quote: true }
  });
  if (!load) return res.status(404).json({ error: 'Public load not found' });
  res.json(serializePublicLoad(load));
});

export default router;
