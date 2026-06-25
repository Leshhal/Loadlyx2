import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function attachTags(tx, tenantId, productId, tags) {
  for (const rawName of tags) {
    const name = rawName.trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const tag = await tx.tag.upsert({
      where: { tenantId_slug: { tenantId, slug } },
      update: { name },
      create: { tenantId, name, slug }
    });
    await tx.productTag.upsert({
      where: { productId_tagId: { productId, tagId: tag.id } },
      update: {},
      create: { productId, tagId: tag.id }
    });
  }
}

async function upsertProduct(tx, tenantId, data) {
  const existing = await tx.product.findFirst({ where: { tenantId, slug: data.slug } });
  const product = existing
    ? await tx.product.update({
        where: { id: existing.id },
        data: {
          ...data,
          weightKg: data.weightKg.toString(),
          categoryId: data.categoryId
        }
      })
    : await tx.product.create({
        data: {
          ...data,
          tenantId,
          weightKg: data.weightKg.toString()
        }
      });

  await tx.productImage.deleteMany({ where: { productId: product.id } });
  if (data.images?.length) {
    await tx.productImage.createMany({
      data: data.images.map((image, index) => ({
        productId: product.id,
        url: image.url,
        altText: image.altText,
        position: image.position ?? index
      }))
    });
  }

  await tx.productTag.deleteMany({ where: { productId: product.id } });
  await attachTags(tx, tenantId, product.id, data.tags || []);

  return product;
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
update: {
name: 'Loadlyx Demo',
slug: 'demo',
subdomain: 'demo',
primaryDomain: null,
isActive: true,
isMaster: false,
subscriptionPlan: 'free',
email: 'demo@example.com',
brandingJson: {
brandName: 'Loadlyx Demo',
primaryColor: '#2563eb'
}
},
create: {
name: 'Loadlyx Demo',
slug: 'demo',
subdomain: 'demo',
primaryDomain: null,
isActive: true,
isMaster: false,
subscriptionPlan: 'free',
email: 'demo@example.com',
brandingJson: {
brandName: 'Loadlyx Demo',
primaryColor: '#2563eb'
}
}
});

  const movingSupplies = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'moving-supplies' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Moving Supplies',
      slug: 'moving-supplies',
      description: 'Boxes, tape, protective wrap, and other moving essentials.'
    }
  });

  const furniture = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'furniture' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Furniture',
      slug: 'furniture',
      description: 'Furniture products for staged homes, apartments, and moving clients.'
    }
  });

  await prisma.$transaction(async (tx) => {
    await upsertProduct(tx, tenant.id, {
      categoryId: movingSupplies.id,
      name: 'Heavy Duty Moving Boxes (10 Pack)',
      slug: 'heavy-duty-moving-boxes-10-pack',
      description: 'Strong corrugated moving boxes for books, kitchen items, and general packing.',
      longDescription: 'These heavy duty moving boxes are built for real household and office moves. The reinforced corrugated walls help protect books, pantry items, decor, files, and small electronics during packing, storage, and transport. They are a practical choice for apartment moves, family homes, and staged storage setups where consistent box sizing matters. Use them with packing tape, bubble wrap, and labels to build a cleaner, faster packing system.',
      seoTitle: 'Heavy Duty Moving Boxes (10 Pack) | Moving Supplies Canada',
      metaDescription: 'Buy heavy duty moving boxes in Canada. Great for apartment moves, home moves, storage, and organized packing.',
      canonicalUrl: null,
      priceCents: 2499,
      sku: 'BOX-HD-10',
      stock: 120,
      weightKg: 4.5,
      isFurniture: false,
      isMovingSupply: true,
      images: {
        create: [
        {
          url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
          altText: 'Heavy duty moving boxes stacked for a household move',
          position: 0
        }
       ]
      }
    });

    await upsertProduct(tx, tenant.id, {
      categoryId: movingSupplies.id,
      name: 'Packing Tape (6 Roll Pack)',
      slug: 'packing-tape-6-roll-pack',
      description: 'Clear heavy duty packing tape for sealing moving boxes and storage cartons.',
      longDescription: 'This six-roll packing tape bundle is designed for moving day efficiency. It bonds well to corrugated boxes and helps keep cartons sealed through lifting, stacking, and transport. Use it for house moves, office relocations, short-term storage, and supply kits sold alongside moving services. It is an easy add-on item for customers booking a move quote and needing a complete packing bundle.',
      seoTitle: 'Packing Tape (6 Roll Pack) | Moving Supplies Canada',
      metaDescription: 'Order heavy duty packing tape for moving boxes, storage, and shipping. Strong hold for home and office moves.',
      canonicalUrl: null,
      priceCents: 1099,
      sku: 'TAPE-6PK',
      stock: 200,
      weightKg: 1.1,
      isFurniture: false,
      isMovingSupply: true,
      images: {
        create: [
        {
          url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1200&q=80',
          altText: 'Clear packing tape for sealing cardboard moving boxes',
          position: 0
        }
       ]
      }
    });

    await upsertProduct(tx, tenant.id, {
      categoryId: furniture.id,
      name: 'Modern Accent Chair',
      slug: 'modern-accent-chair',
      description: 'Clean-lined accent chair for living rooms, staging, and furnished rentals.',
      longDescription: 'This modern accent chair fits living rooms, waiting areas, staged listings, and furnished rentals. It works well as part of a furniture category inside Loadlyx because it supports both local delivery and broader store merchandising. The neutral styling makes it easier to pair with sofas, sectionals, and decor when building category pages and internal product links.',
      seoTitle: 'Modern Accent Chair | Furniture Delivery and Staging',
      metaDescription: 'Shop a modern accent chair for living rooms, staging, rentals, and furniture delivery orders.',
      canonicalUrl: null,
      priceCents: 15999,
      sku: 'FURN-CHAIR-01',
      stock: 8,
      weightKg: 14.0,
      isFurniture: true,
      isMovingSupply: false,
      images: {
        create: [
        {
          url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
          altText: 'Modern accent chair for living room furniture delivery',
          position: 0
        }
      ]
      }
    });

  const quoteId = 'demo-public-quote';
  await tx.quote.upsert({
    where: { id: quoteId },
    update: {},
    create: {
      id: quoteId,
      tenantId: tenant.id,
      fullName: 'Public Demo Customer',
      email: 'demo@example.com',
      phone: '555-0100',
      fromCountry: 'CA',
      fromProvince: 'SK',
      fromCity: 'Saskatoon',
      toCountry: 'CA',
      toProvince: 'AB',
      toCity: 'Calgary',
      moveDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
      bedrooms: 2,
      estimatedWeightKg: '2800',
      comments: '2 bedroom move with sectional, mattress, dining table, and boxes.',
      status: 'LOAD_CREATED'
    }
  });

  await tx.load.upsert({
    where: { quoteId },
    update: {
      tenantId: tenant.id,
      originCountry: 'CA',
      originProvince: 'SK',
      originCity: 'Saskatoon',
      destinationCountry: 'CA',
      destinationProvince: 'AB',
      destinationCity: 'Calgary',
      pickupDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
      notes: '2 bedroom move with sectional, mattress, dining table, and boxes.',
      estimatedWeightKg: '2800',
      status: 'POSTED'
    },
    create: {
      tenantId: tenant.id,
      quoteId,
      originCountry: 'CA',
      originProvince: 'SK',
      originCity: 'Saskatoon',
      destinationCountry: 'CA',
      destinationProvince: 'AB',
      destinationCity: 'Calgary',
      pickupDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
      notes: '2 bedroom move with sectional, mattress, dining table, and boxes.',
      estimatedWeightKg: '2800',
      status: 'POSTED'
    }
  });

  await tx.carrierProfile.upsert({
    where: { id: 'demo-carrier-profile' },
    update: {},
    create: {
      id: 'demo-carrier-profile',
      tenantId: tenant.id,
      companyName: 'Prairie Carrier Demo',
      contactName: 'Dispatch Demo',
      email: 'carrier-demo@example.com',
      phone: '555-0110',
      serviceAreas: 'Saskatoon, Regina, Calgary, Edmonton',
      fleetSize: 4,
      equipmentTypes: '26ft truck, cube van, enclosed trailer',
      notes: 'Seeded carrier profile for Phase 1.5 placeholder.',
      status: 'APPROVED'
    }
  }); 
}); 
  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
