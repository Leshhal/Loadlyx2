import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const temporaryPassword = process.env.YXE_TOTES_TEMPORARY_PASSWORD;

const categoryDefinitions = [
  ['moving-boxes', 'Moving Boxes', 'Reliable boxes and complete moving kits.', 'BOX', 10],
  ['cargo-management', 'Cargo Management', 'Tie-downs, blankets, and cargo protection.', 'TRUCK', 20],
  ['supplies', 'Supplies', 'Packing, wrapping, labels, and furniture protection.', 'PACKAGE', 30],
];

const cansaskProducts = [
  ['Small Moving Box','moving-boxes'],['Medium Moving Box','moving-boxes'],['Large Moving Box','moving-boxes'],['Extra-Large Moving Box','moving-boxes'],['Wardrobe Box','moving-boxes'],['Dish Pack Box','moving-boxes'],['File Box','moving-boxes'],['Mirror and Picture Box','moving-boxes'],['TV Moving Box','moving-boxes'],
  ['Studio Apartment Moving Kit','moving-boxes'],['One-Bedroom Moving Kit','moving-boxes'],['Two-Bedroom Moving Kit','moving-boxes'],['Three-Bedroom Moving Kit','moving-boxes'],['Small Office Moving Kit','moving-boxes'],['Kitchen Packing Kit','moving-boxes'],['Fragile Item Packing Kit','moving-boxes'],
  ['Light-Duty Ratchet Straps','cargo-management'],['Heavy-Duty Ratchet Straps','cargo-management'],['Bungee Cord Set','cargo-management'],['Cargo Tie-Down Set','cargo-management'],['Moving Rope','cargo-management'],['Stretch Wrap','cargo-management'],['Furniture Moving Blankets','cargo-management'],['Corner Protectors','cargo-management'],
  ['Packing Tape','supplies'],['Tape Gun','supplies'],['Tape Gun with Tape Bundle','supplies'],['Moving Labels','supplies'],['Fragile Labels','supplies'],['Permanent Markers','supplies'],['Packing Paper','supplies'],['Bubble Wrap','supplies'],['Foam Wrap','supplies'],['Shrink Wrap','supplies'],['Furniture Wrap','supplies'],['Box Cutter','supplies'],['Scissors','supplies'],['Packing Peanuts','supplies'],['Zip Ties','supplies'],
  ['Small Mattress Cover','supplies'],['Double Mattress Cover','supplies'],['Queen Mattress Cover','supplies'],['King Mattress Cover','supplies'],['Sofa Cover','supplies'],['Chair Cover','supplies'],['Appliance Cover','supplies'],['Dust Cover','supplies'],
];

function slugify(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

async function provision() {
  if (!temporaryPassword && !dryRun) throw new Error('Set YXE_TOTES_TEMPORARY_PASSWORD for one-time account provisioning. It is never stored in source or logs.');
  if (dryRun) return console.log(JSON.stringify({ dryRun: true, tenant: 'yxetotes', yxeProducts: 3, cansaskProducts: cansaskProducts.length, categories: categoryDefinitions.length }));

  const yxe = await prisma.tenant.upsert({
    where: { slug: 'yxetotes' },
    update: { name: 'YXE Totes', email: 'yxetotes@loadlyx.com', subdomain: 'yxetotes', isActive: true,
      brandingJson: { businessType: 'TOTE_RENTAL', city: 'Saskatoon', heroHeading: 'Reusable moving totes, delivered in Saskatoon', heroDescription: 'Skip disposable cardboard. Choose a clean tote package delivered about one week before your move and collected about one week after.', serviceArea: 'Saskatoon and approved surrounding communities', rentalTerms: 'Two-week minimum rental. Delivery and pickup dates are confirmed before checkout.', ctaText: 'Reserve your totes', contactEmail: 'yxetotes@loadlyx.com', bannerAlt: 'Reusable blue moving totes ready for a Saskatoon move', faq: [{ question: 'How long is the minimum rental?', answer: 'Every package includes a two-week minimum rental.' }, { question: 'When are totes delivered and collected?', answer: 'Delivery is normally one week before the move and pickup is normally one week after.' }] } },
    create: { name: 'YXE Totes', slug: 'yxetotes', subdomain: 'yxetotes', email: 'yxetotes@loadlyx.com', subscriptionPlan: 'starter', brandingJson: { businessType: 'TOTE_RENTAL', city: 'Saskatoon', heroHeading: 'Reusable moving totes, delivered in Saskatoon', heroDescription: 'Skip disposable cardboard. Choose a clean tote package delivered about one week before your move and collected about one week after.', serviceArea: 'Saskatoon and approved surrounding communities', rentalTerms: 'Two-week minimum rental. Delivery and pickup dates are confirmed before checkout.', ctaText: 'Reserve your totes', contactEmail: 'yxetotes@loadlyx.com', bannerAlt: 'Reusable blue moving totes ready for a Saskatoon move' } }
  });
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  await prisma.user.upsert({ where: { email: 'yxetotes@loadlyx.com' }, update: { tenantId: yxe.id, role: 'TENANT_ADMIN', isActive: true }, create: { tenantId: yxe.id, fullName: 'YXE Totes Administrator', email: 'yxetotes@loadlyx.com', passwordHash, role: 'TENANT_ADMIN', isActive: true, emailVerifiedAt: new Date() } });
  const rentalCategory = await prisma.category.upsert({ where: { tenantId_slug: { tenantId: yxe.id, slug: 'tote-rentals' } }, update: { name: 'Tote Rentals', description: 'Reusable tote packages with Saskatoon delivery and pickup.', icon: 'PACKAGE', isEnabled: true }, create: { tenantId: yxe.id, slug: 'tote-rentals', name: 'Tote Rentals', description: 'Reusable tote packages with Saskatoon delivery and pickup.', icon: 'PACKAGE', displayOrder: 10 } });
  for (const pack of [{ count: 10, weekly: 4900, initial: 9800, stock: 200 }, { count: 20, weekly: 8900, initial: 17800, stock: 300 }, { count: 30, weekly: 11900, initial: 23800, stock: 450 }]) {
    const name = `${pack.count}-Tote Rental Package`; const slug = slugify(name);
    await prisma.product.upsert({ where: { tenantId_slug: { tenantId: yxe.id, slug } }, update: { categoryId: rentalCategory.id, productType: 'RENTAL', weeklyRateCents: pack.weekly, minimumRentalWeeks: 2, minimumChargeCents: pack.initial, rentalInventoryUnits: pack.stock, isActive: true }, create: { tenantId: yxe.id, categoryId: rentalCategory.id, name, slug, sku: `YXE-TOTE-${pack.count}`, description: `${pack.count} reusable totes with Saskatoon drop-off about one week before the move and pickup about one week after. Two-week minimum.`, priceCents: pack.initial, weeklyRateCents: pack.weekly, minimumRentalWeeks: 2, minimumChargeCents: pack.initial, rentalInventoryUnits: pack.stock, stock: pack.stock, weightKg: 0, productType: 'RENTAL', metadataJson: { toteCount: pack.count, serviceArea: 'Saskatoon', deliveryLeadDays: 7, pickupAfterMoveDays: 7 } } });
  }

  const cansask = await prisma.tenant.findUnique({ where: { slug: 'cansask' } });
  if (cansask) {
    const categories = {};
    for (const [slug,name,description,icon,displayOrder] of categoryDefinitions) categories[slug] = await prisma.category.upsert({ where: { tenantId_slug: { tenantId: cansask.id, slug } }, update: { description, icon, displayOrder, isEnabled: true }, create: { tenantId: cansask.id, slug, name, description, icon, displayOrder } });
    for (const [name, categorySlug] of cansaskProducts) {
      const slug = slugify(name); const kit = /Kit$/.test(name);
      await prisma.product.upsert({ where: { tenantId_slug: { tenantId: cansask.id, slug } }, update: { categoryId: categories[categorySlug].id, description: undefined }, create: { tenantId: cansask.id, categoryId: categories[categorySlug].id, name, slug, sku: `CS-${slug.toUpperCase().slice(0,28)}`, description: `Professional ${name.toLowerCase()} for safer, more organized moves.`, priceCents: kit ? 9999 : 1499, stock: 50, weightKg: kit ? 8 : 1, productType: kit ? 'BUNDLE' : 'PHYSICAL', metadataJson: kit ? { placeholderPrice: true, editableContents: true, includedProducts: [] } : { placeholderPrice: true } } });
    }
  }
  for (const [label, badgeType, priority] of [['NEW','NEW',10],['SALE','SALE',20],['BEST SELLER','BEST_SELLER',30],['LOW STOCK','LOW_STOCK',40]]) await prisma.productBadge.upsert({ where: { id: `global-${slugify(label)}` }, update: { label, badgeType, enabled: true }, create: { id: `global-${slugify(label)}`, tenantId: yxe.id, label, badgeType, displayPriority: priority, enabled: true, isGlobalTemplate: true } });
  console.log(JSON.stringify({ completed: true, tenant: yxe.slug, temporaryCredentialLogged: false, cansaskCatalogUpdated: Boolean(cansask) }));
}

provision().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
