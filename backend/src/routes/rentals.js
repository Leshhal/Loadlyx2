import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/requireauth.js';
import { calculateRentalPrice, hasRentalCapacity, validateRentalDates } from '../services/rentalService.js';

const router = Router();
const bookingSchema = z.object({ productId: z.string(), customerEmail: z.string().email(), moveDate: z.coerce.date(), deliveryDate: z.coerce.date(), pickupDate: z.coerce.date(), rentalWeeks: z.coerce.number().int().min(2).max(26), packageQuantity: z.coerce.number().int().min(1).max(10).default(1), deliveryAddress: z.object({ line1: z.string().min(3), city: z.string().min(2), province: z.string().min(2), postalCode: z.string().min(3), country: z.string().default('CA') }) });

router.get('/availability/:productId', async (req, res, next) => { try {
  const start = z.coerce.date().parse(req.query.start); const end = z.coerce.date().parse(req.query.end);
  const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
  if (!product || product.productType !== 'RENTAL' || !product.isActive) return res.status(404).json({ error: 'Rental product not found' });
  const reservations = await prisma.rentalBooking.aggregate({ where: { productId: product.id, status: { in: ['RESERVED','CONFIRMED','ACTIVE'] }, deliveryDate: { lte: end }, pickupDate: { gte: start } }, _sum: { reservedToteUnits: true } });
  return res.json({ availableUnits: Math.max(0, Number(product.rentalInventoryUnits || 0) - Number(reservations._sum.reservedToteUnits || 0)), start, end });
} catch (error) { return next(error); } });

router.post('/book', requireAuth, async (req, res, next) => { try {
  const input = bookingSchema.parse(req.body); validateRentalDates(input);
  const product = await prisma.product.findUnique({ where: { id: input.productId }, include: { tenant: true } });
  if (!product || product.productType !== 'RENTAL' || !product.isActive) return res.status(404).json({ error: 'Rental product not found' });
  const toteCount = Number(product.metadataJson?.toteCount || 0) * input.packageQuantity;
  const weeklyRate = Number(product.weeklyRateCents || 0); const minimum = Number(product.minimumChargeCents || weeklyRate * Number(product.minimumRentalWeeks || 2)); const totalCents = calculateRentalPrice({ weeklyRateCents: weeklyRate, minimumRentalWeeks: Number(product.minimumRentalWeeks || 2), minimumChargeCents: minimum, rentalWeeks: input.rentalWeeks, packageQuantity: input.packageQuantity });
  const overlapping = await prisma.rentalBooking.aggregate({ where: { productId: product.id, status: { in: ['RESERVED','CONFIRMED','ACTIVE'] }, deliveryDate: { lte: input.pickupDate }, pickupDate: { gte: input.deliveryDate } }, _sum: { reservedToteUnits: true } });
  if (!hasRentalCapacity({ inventoryUnits: product.rentalInventoryUnits, alreadyReservedUnits: overlapping._sum.reservedToteUnits || 0, requestedUnits: toteCount })) return res.status(409).json({ error: 'Not enough totes are available for those dates' });
  const snapshot = { productId: product.id, productName: product.name, tenantId: product.tenantId, weeklyRateCents: weeklyRate, minimumRentalWeeks: product.minimumRentalWeeks, minimumChargeCents: minimum, rentalWeeks: input.rentalWeeks, toteCount, totalCents, dates: { move: input.moveDate, delivery: input.deliveryDate, pickup: input.pickupDate } };
  return res.status(201).json(await prisma.rentalBooking.create({ data: { tenantId: product.tenantId, productId: product.id, customerEmail: input.customerEmail, moveDate: input.moveDate, deliveryDate: input.deliveryDate, pickupDate: input.pickupDate, rentalWeeks: input.rentalWeeks, packageQuantity: input.packageQuantity, reservedToteUnits: toteCount, weeklyRateCents: weeklyRate, minimumChargeCents: minimum, totalCents, deliveryAddressJson: input.deliveryAddress, serviceArea: product.metadataJson?.serviceArea || null, contractSnapshotJson: snapshot } }));
} catch (error) { return next(error); } });

export default router;
