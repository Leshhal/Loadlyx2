import { Router } from 'express';

import { prisma } from '../db/prisma.js';

import { z } from 'zod';

import { requireAuth } from '../middleware/requireauth.js';
import { requireEntitlement } from '../middleware/requireEntitlement.js';



const router = Router();
const PLATFORM_ROLES = new Set(['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT']);

function writableTenantId(req) {
  if (req.user?.tenantId) return req.user.tenantId;
  if (PLATFORM_ROLES.has(req.user?.role) && req.tenant?.id) return req.tenant.id;
  return null;
}



function normalizeTagName(tag) {

  return tag.trim();

}



function slugify(value) {

  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

}



function serializeProduct(product) {

  return {

    ...product,

    tags: product.productTags?.map((item) => item.tag) || [],

    images: product.images || [],

    primaryImage: product.images?.[0] || null

  };

}



async function upsertProductTags(tx, tenantId, productId, tagNames = []) {

  const cleaned = [...new Set(tagNames.map(normalizeTagName).filter(Boolean))];

  await tx.productTag.deleteMany({ where: { productId } });



  for (const name of cleaned) {

    const slug = slugify(name);

    const tag = await tx.tag.upsert({

      where: { tenantId_slug: { tenantId, slug } },

      update: { name },

      create: { tenantId, name, slug }

    });



    await tx.productTag.create({ data: { productId, tagId: tag.id } });

  }

}



async function replaceProductImages(tx, tenantId, productId, images = []) {

  await tx.productImage.deleteMany({ where: { productId } });

  if (!images.length) return;

  const assetIds = images.map((image) => image.assetId).filter(Boolean);
  if (assetIds.length) {
    const ownedAssets = await tx.mediaAsset.count({ where: { id: { in: assetIds }, tenantId, status: 'READY' } });
    if (ownedAssets !== new Set(assetIds).size) throw new Error('One or more uploaded images do not belong to this tenant');
  }



  await tx.productImage.createMany({

    data: images.map((image, index) => ({

      productId,

      url: image.url,

      altText: image.altText || null,

      position: image.position ?? index,

      assetId: image.assetId || null

    }))

  });

}



const imageSchema = z.object({

  url: z.string().url(),

  altText: z.string().optional().or(z.literal('')),

  position: z.number().int().nonnegative().optional(),

  assetId: z.string().optional()

});

const variantSchema = z.object({ name: z.string().min(1).max(160), sku: z.string().max(120).optional(), priceCents: z.number().int().nonnegative(), salePriceCents: z.number().int().nonnegative().optional().nullable(), stock: z.number().int().nonnegative().default(0), optionsJson: z.record(z.any()).optional(), isActive: z.boolean().default(true) });

async function replaceProductVariants(tx, productId, variants = []) {
  await tx.productVariant.deleteMany({ where: { productId } });
  if (variants.length) await tx.productVariant.createMany({ data: variants.map((variant) => ({ ...variant, productId, sku: variant.sku || null, salePriceCents: variant.salePriceCents ?? null })) });
}



const productCreateSchema = z.object({

  name: z.string().min(2),

  slug: z.string().min(2),

  description: z.string().optional(),

  longDescription: z.string().optional(),

  seoTitle: z.string().optional(),

  metaDescription: z.string().optional(),

  canonicalUrl: z.string().url().optional().or(z.literal('')),

  priceCents: z.number().int().nonnegative(),
  salePriceCents: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().length(3).default('cad'),
  productType: z.enum(['PHYSICAL','RENTAL','SERVICE_ADD_ON','BUNDLE']).default('PHYSICAL'),
  publicationStatus: z.enum(['DRAFT','ACTIVE','ARCHIVED']).default('ACTIVE'),

  sku: z.string().optional(),

  stock: z.number().int().nonnegative().default(0),

  weightKg: z.number().nonnegative(),

  categoryId: z.string().nullable().optional(),

  isFurniture: z.boolean().default(false),

  isMovingSupply: z.boolean().default(true),

  images: z.array(imageSchema).optional().default([]),

  imageUrl: z.string().url().optional().or(z.literal('')),

  altText: z.string().optional(),

  tags: z.array(z.string()).optional().default([]),
  variants: z.array(variantSchema).max(100).optional().default([])

});



const productUpdateSchema = z.object({

  name: z.string().min(2).optional(),

  slug: z.string().min(2).optional(),

  description: z.string().nullable().optional(),

  longDescription: z.string().nullable().optional(),

  seoTitle: z.string().nullable().optional(),

  metaDescription: z.string().nullable().optional(),

  canonicalUrl: z.string().url().nullable().optional().or(z.literal('')),

  priceCents: z.number().int().nonnegative().optional(),
  salePriceCents: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().length(3).optional(),
  productType: z.enum(['PHYSICAL','RENTAL','SERVICE_ADD_ON','BUNDLE']).optional(),
  publicationStatus: z.enum(['DRAFT','ACTIVE','ARCHIVED']).optional(),

  sku: z.string().nullable().optional(),

  stock: z.number().int().nonnegative().optional(),

  weightKg: z.number().nonnegative().optional(),

  categoryId: z.string().nullable().optional(),

  isActive: z.boolean().optional(),

  isFurniture: z.boolean().optional(),

  isMovingSupply: z.boolean().optional(),

  images: z.array(imageSchema).optional(),

  imageUrl: z.string().url().optional().or(z.literal('')),

  altText: z.string().nullable().optional(),

  tags: z.array(z.string()).optional(),
  variants: z.array(variantSchema).max(100).optional()

});



const includeProduct = {

  category: true,

  images: { orderBy: { position: 'asc' } },

  variants: { orderBy: { createdAt: 'asc' } },

  productTags: { include: { tag: true } }
  ,badges: { where: { enabled: true, OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }] }, orderBy: { displayPriority: 'asc' }, take: 3 }

};



router.get('/', async (req, res) => {
try {
const tenantSlug = req.headers['x-tenant-slug'];
const { featured } = req.query;

let where = {};

if (tenantSlug) {
const normalizedTenantSlug = String(tenantSlug).trim().toLowerCase();

const tenant = await prisma.tenant.findFirst({
where: {
OR: [
{ slug: normalizedTenantSlug },
{ subdomain: normalizedTenantSlug }
]
}
});

if (!tenant) {
return res.status(404).json({ error: 'Tenant not found' });
}

where.tenantId = tenant.id;
where.publicationStatus = 'ACTIVE';
where.isActive = true;
}

if (featured === 'true') {
where.featured = true;
}

const products = await prisma.product.findMany({
where,
include: includeProduct,
orderBy: { createdAt: 'desc' }
});

res.json(products.map(serializeProduct));
} catch (error) {
console.error('Error fetching products:', error);
res.status(500).json({ error: 'Failed to fetch products' });
}
});





router.get('/slug/:slug', async (req, res) => {
try {
const tenantId = req.tenant?.id || req.user?.tenantId;

if (!tenantId) {
return res.status(401).json({ error: 'Unauthorized or tenant not found' });
}

const product = await prisma.product.findFirst({
where: {
tenantId,
slug: req.params.slug
},
include: includeProduct
});

if (!product) {
return res.status(404).json({ error: 'Product not found' });
}

res.json(serializeProduct(product));
} catch (error) {
console.error('Error fetching product by slug:', error);
res.status(500).json({ error: 'Failed to fetch product' });
}
});




router.post('/', requireAuth, requireEntitlement('products'), async (req, res) => {
  const tenantId = writableTenantId(req);
  if (!tenantId) {

    return res.status(401).json({ error: 'Unauthorized' });

  }



  const data = productCreateSchema.parse(req.body);

  const normalizedImages = data.images.length

    ? data.images

    : (data.imageUrl ? [{ url: data.imageUrl, altText: data.altText || data.name, position: 0 }] : []);



  const product = await prisma.$transaction(async (tx) => {

    const created = await tx.product.create({

      data: {

        name: data.name,

        slug: data.slug,

        description: data.description,

        longDescription: data.longDescription,

        seoTitle: data.seoTitle,

        metaDescription: data.metaDescription,

        canonicalUrl: data.canonicalUrl || null,

        priceCents: data.priceCents,
        salePriceCents: data.salePriceCents ?? null,
        currency: data.currency.toLowerCase(),
        productType: data.productType,
        publicationStatus: data.publicationStatus,

        sku: data.sku,

        stock: data.stock,

        weightKg: data.weightKg.toString(),

        categoryId: data.categoryId || null,

        isFurniture: data.isFurniture,

        isMovingSupply: data.isMovingSupply,

        tenantId

      }

    });



    await replaceProductImages(tx, tenantId, created.id, normalizedImages);

    await upsertProductTags(tx, tenantId, created.id, data.tags);
    await replaceProductVariants(tx, created.id, data.variants);



    return tx.product.findUnique({

      where: { id: created.id },

      include: includeProduct

    });

  });



  res.status(201).json(serializeProduct(product));

});



router.put('/:id', requireAuth, requireEntitlement('products'), async (req, res) => {
  const tenantId = writableTenantId(req);
  if (!tenantId) {

    return res.status(401).json({ error: 'Unauthorized' });

  }



  const data = productUpdateSchema.parse(req.body);



  const existing = await prisma.product.findFirst({

    where: { id: req.params.id, tenantId },

    include: includeProduct

  });



  if (!existing) return res.status(404).json({ error: 'Product not found' });



  const normalizedImages = data.images

    ? data.images

    : (data.imageUrl

        ? [{ url: data.imageUrl, altText: data.altText || existing.images?.[0]?.altText || existing.name, position: 0 }]

        : undefined);



  const product = await prisma.$transaction(async (tx) => {

    await tx.product.update({

      where: { id: req.params.id },

      data: {

        ...(data.name !== undefined ? { name: data.name } : {}),

        ...(data.slug !== undefined ? { slug: data.slug } : {}),

        ...(data.description !== undefined ? { description: data.description } : {}),

        ...(data.longDescription !== undefined ? { longDescription: data.longDescription } : {}),

        ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),

        ...(data.metaDescription !== undefined ? { metaDescription: data.metaDescription } : {}),

        ...(data.canonicalUrl !== undefined ? { canonicalUrl: data.canonicalUrl || null } : {}),

        ...(data.priceCents !== undefined ? { priceCents: data.priceCents } : {}),
        ...(data.salePriceCents !== undefined ? { salePriceCents: data.salePriceCents } : {}),
        ...(data.currency !== undefined ? { currency: data.currency.toLowerCase() } : {}),
        ...(data.productType !== undefined ? { productType: data.productType } : {}),
        ...(data.publicationStatus !== undefined ? { publicationStatus: data.publicationStatus } : {}),

        ...(data.sku !== undefined ? { sku: data.sku } : {}),

        ...(data.stock !== undefined ? { stock: data.stock } : {}),

        ...(data.weightKg !== undefined ? { weightKg: data.weightKg.toString() } : {}),

        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),

        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),

        ...(data.isFurniture !== undefined ? { isFurniture: data.isFurniture } : {}),

        ...(data.isMovingSupply !== undefined ? { isMovingSupply: data.isMovingSupply } : {})

      }

    });



    if (normalizedImages !== undefined) {

      await replaceProductImages(tx, tenantId, req.params.id, normalizedImages);

    }



    if (data.tags) {

      await upsertProductTags(tx, tenantId, req.params.id, data.tags);

    }

    if (data.variants) await replaceProductVariants(tx, req.params.id, data.variants);



    return tx.product.findUnique({

      where: { id: req.params.id },

      include: includeProduct

    });

  });



  res.json(serializeProduct(product));

});

router.delete('/:id', requireAuth, requireEntitlement('products'), async (req, res) => {
  const tenantId = writableTenantId(req);
  if (!tenantId) return res.status(401).json({ error: 'Select a tenant before managing products' });
  const product = await prisma.product.findFirst({ where: { id: req.params.id, tenantId } });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  await prisma.product.delete({ where: { id: product.id } });
  return res.status(204).end();
});



export default router;
