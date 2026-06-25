import { resolveTenant } from '../lib/tenant.js';
import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { z } from 'zod';
import { parseQuoteComment } from '../services/upsellService.js';

const router = Router();

router.get('/', async (req, res) => {
try {
const tenant = await resolveTenant(req);

const quotes = await prisma.quote.findMany({
where: {
tenantId: tenant.id
},
orderBy: {
createdAt: 'desc'
}
});

res.json(quotes);
} catch (error) {
console.error('Error fetching quotes:', error);
res.status(500).json({ error: 'Failed to fetch quotes' });
}
});

router.post('/', async (req, res) => {
  const schema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7),
    address: z.string().optional(),
    fromCountry: z.enum(['CA', 'US']).default('CA'),
    fromProvince: z.string().optional(),
    fromState: z.string().optional(),
    fromCity: z.string().min(2),
    toCountry: z.enum(['CA', 'US']).default('CA'),
    toProvince: z.string().optional(),
    toState: z.string().optional(),
    toCity: z.string().min(2),
    moveDate: z.string().datetime().optional().or(z.literal('')),
    bedrooms: z.number().int().nonnegative().optional(),
    estimatedWeightKg: z.number().nonnegative().optional(),
    estimatedVolume: z.number().nonnegative().optional(),
    comments: z.string().optional(),
    attribution: z.object({
      sessionId: z.string().optional(),
      referrer: z.string().optional(),
      landingPage: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      utmTerm: z.string().optional(),
      utmContent: z.string().optional()
    }).optional()
  }).superRefine((input, ctx) => {
    if (input.fromCountry === 'CA' && !input.fromProvince) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fromProvince'], message: 'From province is required for Canada.' });
    }
    if (input.fromCountry === 'US' && !input.fromState) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fromState'], message: 'From state is required for USA.' });
    }
    if (input.toCountry === 'CA' && !input.toProvince) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['toProvince'], message: 'To province is required for Canada.' });
    }
    if (input.toCountry === 'US' && !input.toState) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['toState'], message: 'To state is required for USA.' });
    }
  });

  const input = schema.parse(req.body);
  const parsed = parseQuoteComment(input.comments || '');

  const result = await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.create({
      data: {
        tenantId: req.tenant.id,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        fromCountry: input.fromCountry,
        fromProvince: input.fromCountry === 'CA' ? input.fromProvince : null,
        fromState: input.fromCountry === 'US' ? input.fromState : null,
        fromCity: input.fromCity,
        toCountry: input.toCountry,
        toProvince: input.toCountry === 'CA' ? input.toProvince : null,
        toState: input.toCountry === 'US' ? input.toState : null,
        toCity: input.toCity,
        moveDate: input.moveDate ? new Date(input.moveDate) : null,
        bedrooms: input.bedrooms,
        estimatedWeightKg: input.estimatedWeightKg?.toString(),
        estimatedVolume: input.estimatedVolume?.toString(),
        comments: input.comments,
        parsedRooms: parsed.rooms.join(','),
        parsedItemsJson: parsed.aiReady,
        parsedSuppliesJson: { keywordsDetected: parsed.keywordsDetected },
        recommendedProductsJson: {
          productSlugs: parsed.recommendedProductSlugs,
          suggestedKitId: parsed.suggestedKit.id,
          suggestedKitProductSlugs: parsed.suggestedKit.productSlugs
        },
        status: 'NEW'
      }
    });

    const recommendedProducts = await tx.product.findMany({
      where: {
        tenantId: req.tenant.id,
        slug: { in: parsed.recommendedProductSlugs }
      },
      orderBy: { name: 'asc' }
    });

    const kitProducts = await tx.product.findMany({
      where: {
        tenantId: req.tenant.id,
        slug: { in: parsed.suggestedKit.productSlugs.map((item) => item.slug) }
      }
    });

    const suggestedKit = {
      ...parsed.suggestedKit,
      products: parsed.suggestedKit.productSlugs.map((kitItem) => {
        const product = kitProducts.find((entry) => entry.slug === kitItem.slug);
        return {
          slug: kitItem.slug,
          quantity: kitItem.quantity,
          product
        };
      })
    };

    const load = await tx.load.create({
      data: {
        tenantId: req.tenant.id,
        quoteId: quote.id,
        originCountry: input.fromCountry,
        originProvince: input.fromCountry === 'CA' ? input.fromProvince : null,
        originState: input.fromCountry === 'US' ? input.fromState : null,
        originCity: input.fromCity,
        destinationCountry: input.toCountry,
        destinationProvince: input.toCountry === 'CA' ? input.toProvince : null,
        destinationState: input.toCountry === 'US' ? input.toState : null,
        destinationCity: input.toCity,
        pickupDate: input.moveDate ? new Date(input.moveDate) : null,
        notes: input.comments,
        estimatedWeightKg: input.estimatedWeightKg?.toString(),
        estimatedVolume: input.estimatedVolume?.toString(),
        status: 'PENDING'
      }
    });

    await tx.quote.update({
      where: { id: quote.id },
      data: { status: 'LOAD_CREATED' }
    });

    return { quote, load, recommendedProducts, suggestedKit };
  });

  res.status(201).json(result);
});

export default router;
