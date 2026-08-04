import { Router } from 'express';
import { z } from 'zod';
import { quoteShipping } from '../services/shippingService.js';

const router = Router();
const schema = z.object({ tenantId: z.string().optional(), originPostalCode: z.string().min(3), destinationPostalCode: z.string().min(3), originCountry: z.string().default('CA'), destinationCountry: z.string().default('CA'), residential: z.boolean().default(true), declaredValueCents: z.number().int().min(0).default(0), currency: z.string().default('cad'), packages: z.array(z.object({ weightKg: z.number().positive(), lengthCm: z.number().positive(), widthCm: z.number().positive(), heightCm: z.number().positive(), quantity: z.number().int().positive().default(1) })).min(1) });
router.post('/quote', async (req, res, next) => { try { const input = schema.parse(req.body); const tenantId = req.tenant?.id || input.tenantId; if (!tenantId) return res.status(400).json({ error: 'Tenant is required' }); return res.json({ quotes: await quoteShipping(tenantId, input) }); } catch (error) { return next(error); } });
export default router;
