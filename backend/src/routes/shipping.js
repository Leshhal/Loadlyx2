import { Router } from 'express';
import { z } from 'zod';
import { getShippingQuotes } from '../utils/shipping.js';

const router = Router();

router.post('/quote', async (req, res) => {
  try {
    const schema = z.object({
      country: z.string().default('CA'),
      province: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      items: z.array(z.object({
        weightKg: z.union([z.number(), z.string()]).optional(),
        quantity: z.union([z.number(), z.string()]).optional()
      })).default([])
    });

    const input = schema.parse(req.body || {});
    const quotes = await getShippingQuotes(input);
    res.json(quotes);
  } catch (error) {
    console.error('Shipping quote error:', error);
    res.status(500).json({ error: 'Failed to calculate shipping quote' });
  }
});

export default router;
