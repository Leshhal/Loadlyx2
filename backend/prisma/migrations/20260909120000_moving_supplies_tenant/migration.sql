-- Separate Loadlyx-owned retail inventory from Can-Sask service operations.
DO $$
DECLARE cansask_id text; yxe_count integer; unexpected integer;
BEGIN
  SELECT id INTO cansask_id FROM "Tenant" WHERE slug='cansask';
  IF cansask_id IS NULL THEN RAISE EXCEPTION 'PRODUCT TENANT MIGRATION SAFETY BLOCKED: Can-Sask tenant missing'; END IF;
  SELECT count(*) INTO yxe_count FROM "Tenant" WHERE slug='yxetotes';
  IF yxe_count <> 1 THEN RAISE EXCEPTION 'PRODUCT TENANT MIGRATION SAFETY BLOCKED: YXE Totes tenant missing or duplicated'; END IF;
  SELECT count(*) INTO unexpected FROM "Product" p LEFT JOIN "Category" c ON c.id=p."categoryId"
    WHERE p."tenantId"=cansask_id AND (c.slug IS NULL OR c.slug NOT IN ('moving-boxes','moving-supplies','hitch-accessories','vehicle-wiring'));
  IF unexpected <> 0 THEN RAISE EXCEPTION 'PRODUCT TENANT MIGRATION SAFETY BLOCKED: % Can-Sask products are outside approved retail categories', unexpected; END IF;
END $$;

INSERT INTO "Tenant" (id,name,slug,"primaryDomain",subdomain,"isActive","isMaster","isDemo","stripePolicy","stripeEnabled","paypalEnabled","subscriptionPlan","brandingJson",email,"createdAt","updatedAt")
VALUES ('tenant-moving-supplies','Moving Supplies','movingsupplies','movingsupplies.loadlyx.com','movingsupplies',true,false,false,'PLATFORM_STRIPE_ALLOWED',true,false,'professional',
'{"businessType":"MOVING_SUPPLIES","brandName":"Moving Supplies","primaryColor":"#2563eb","accentColor":"#38bdf8","heroHeading":"Boxes, packing supplies, cargo gear and moving essentials — all in one place.","heroDescription":"Shop moving boxes, packing protection, cargo securement, hitch accessories and vehicle wiring through a secure Loadlyx storefront.","ctaText":"Shop moving supplies","serviceArea":"Canada","trustHeadline":"Move-ready products in one focused store.","trustCopy":"Server-authoritative pricing, tenant-isolated carts, and secure checkout powered by Loadlyx.","footerDescription":"Moving supplies and cargo gear, powered securely by Loadlyx.","paymentSettings":{}}'::jsonb,
'support@loadlyx.com',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name,"primaryDomain"=EXCLUDED."primaryDomain",subdomain=EXCLUDED.subdomain,"isActive"=true,"stripePolicy"='PLATFORM_STRIPE_ALLOWED',"stripeEnabled"=true,"brandingJson"=COALESCE("Tenant"."brandingJson",'{}'::jsonb)||EXCLUDED."brandingJson","updatedAt"=CURRENT_TIMESTAMP;

-- Test carts may be discarded by explicit owner authorization; orders are never changed.
DELETE FROM "StoreCartItem" WHERE "cartId" IN (SELECT sc.id FROM "StoreCart" sc JOIN "Tenant" t ON t.id=sc."tenantId" WHERE t.slug='cansask');
DELETE FROM "StoreCart" WHERE "tenantId"=(SELECT id FROM "Tenant" WHERE slug='cansask');

-- Move retail-owned supporting records before the products/categories themselves.
UPDATE "ProductBadge" SET "tenantId"=(SELECT id FROM "Tenant" WHERE slug='movingsupplies'),"updatedAt"=CURRENT_TIMESTAMP
 WHERE "tenantId"=(SELECT id FROM "Tenant" WHERE slug='cansask') AND ("productId" IS NOT NULL OR "categoryId" IS NOT NULL);
UPDATE "ProductCollection" SET "tenantId"=(SELECT id FROM "Tenant" WHERE slug='movingsupplies'),"updatedAt"=CURRENT_TIMESTAMP
 WHERE "tenantId"=(SELECT id FROM "Tenant" WHERE slug='cansask');
UPDATE "MediaAsset" SET "tenantId"=(SELECT id FROM "Tenant" WHERE slug='movingsupplies'),"updatedAt"=CURRENT_TIMESTAMP
 WHERE "tenantId"=(SELECT id FROM "Tenant" WHERE slug='cansask') AND id IN (SELECT pi."assetId" FROM "ProductImage" pi JOIN "Product" p ON p.id=pi."productId" WHERE p."tenantId"=(SELECT id FROM "Tenant" WHERE slug='cansask') AND pi."assetId" IS NOT NULL);
UPDATE "InventoryLocation" SET "tenantId"=(SELECT id FROM "Tenant" WHERE slug='movingsupplies'),"updatedAt"=CURRENT_TIMESTAMP WHERE "tenantId"=(SELECT id FROM "Tenant" WHERE slug='cansask');
UPDATE "InventoryStock" SET "tenantId"=(SELECT id FROM "Tenant" WHERE slug='movingsupplies'),"updatedAt"=CURRENT_TIMESTAMP WHERE "tenantId"=(SELECT id FROM "Tenant" WHERE slug='cansask');
UPDATE "InventoryMovement" SET "tenantId"=(SELECT id FROM "Tenant" WHERE slug='movingsupplies') WHERE "tenantId"=(SELECT id FROM "Tenant" WHERE slug='cansask');

UPDATE "Category" SET "tenantId"=(SELECT id FROM "Tenant" WHERE slug='movingsupplies'),"updatedAt"=CURRENT_TIMESTAMP WHERE "tenantId"=(SELECT id FROM "Tenant" WHERE slug='cansask');
UPDATE "Product" SET
 "tenantId"=(SELECT id FROM "Tenant" WHERE slug='movingsupplies'),
 "canonicalUrl"='https://movingsupplies.loadlyx.com/catalog/'||slug,
 "metadataJson"=COALESCE("metadataJson",'{}'::jsonb)||'{"previousTenantSlug":"cansask","catalogOwner":"movingsupplies"}'::jsonb,
 "updatedAt"=CURRENT_TIMESTAMP
WHERE "tenantId"=(SELECT id FROM "Tenant" WHERE slug='cansask');

-- Attach the generated product-specific images that ship with this release.
WITH generated_images(slug,url) AS (
  VALUES
    ('appliance-cover','/store-assets/movingsupplies-appliance-cover.webp'),
    ('box-cutter','/store-assets/movingsupplies-box-cutter.webp'),
    ('bubble-wrap','/store-assets/movingsupplies-bubble-wrap.webp'),
    ('bungee-cord-set','/store-assets/movingsupplies-bungee-cord-set.webp'),
    ('cargo-net','/store-assets/movingsupplies-cargo-net.webp'),
    ('cargo-tie-down-set','/store-assets/movingsupplies-cargo-tie-down-set.webp'),
    ('carpet-protector','/store-assets/movingsupplies-carpet-protector.webp'),
    ('corner-protectors','/store-assets/movingsupplies-corner-protectors.webp'),
    ('dish-cell-kit','/store-assets/movingsupplies-dish-cell-kit.webp'),
    ('dish-pack-box','/store-assets/movingsupplies-dish-pack-box.webp'),
    ('door-jamb-protector','/store-assets/movingsupplies-door-jamb-protector.webp'),
    ('double-mattress-cover','/store-assets/movingsupplies-double-mattress-cover.webp'),
    ('dust-cover','/store-assets/movingsupplies-dust-cover.webp'),
    ('extra-large-moving-box','/store-assets/movingsupplies-extra-large-moving-box.webp'),
    ('file-box','/store-assets/movingsupplies-file-box.webp'),
    ('floor-protection-film','/store-assets/movingsupplies-floor-protection-film.webp'),
    ('foam-wrap','/store-assets/movingsupplies-foam-wrap.webp'),
    ('forearm-lifting-straps','/store-assets/movingsupplies-forearm-lifting-straps.webp'),
    ('four-bedroom-moving-kit','/store-assets/movingsupplies-four-bedroom-moving-kit.webp'),
    ('fragile-item-packing-kit','/store-assets/movingsupplies-fragile-item-packing-kit.webp'),
    ('fragile-labels','/store-assets/movingsupplies-fragile-labels.webp'),
    ('furniture-dolly','/store-assets/movingsupplies-furniture-dolly.webp'),
    ('furniture-moving-blankets','/store-assets/movingsupplies-furniture-moving-blankets.webp'),
    ('furniture-sliders','/store-assets/movingsupplies-furniture-sliders.webp'),
    ('furniture-wrap','/store-assets/movingsupplies-furniture-wrap.webp'),
    ('glass-divider-kit','/store-assets/movingsupplies-glass-divider-kit.webp'),
    ('hand-truck','/store-assets/movingsupplies-hand-truck.webp'),
    ('hanging-file-crate','/store-assets/movingsupplies-hanging-file-crate.webp'),
    ('heavy-duty-ratchet-straps','/store-assets/movingsupplies-heavy-duty-ratchet-straps.webp'),
    ('king-mattress-cover','/store-assets/movingsupplies-king-mattress-cover.webp'),
    ('kitchen-packing-kit','/store-assets/movingsupplies-kitchen-packing-kit.webp'),
    ('lamp-box','/store-assets/movingsupplies-lamp-box.webp'),
    ('large-moving-box','/store-assets/movingsupplies-large-moving-box.webp'),
    ('light-duty-ratchet-straps','/store-assets/movingsupplies-light-duty-ratchet-straps.webp'),
    ('medium-moving-box','/store-assets/movingsupplies-medium-moving-box.webp'),
    ('mirror-and-picture-box','/store-assets/movingsupplies-mirror-and-picture-box.webp'),
    ('moving-day-essentials-bundle','/store-assets/movingsupplies-moving-day-essentials-bundle.webp'),
    ('moving-dolly','/store-assets/movingsupplies-moving-dolly.webp'),
    ('moving-labels','/store-assets/movingsupplies-moving-labels.webp'),
    ('moving-rope','/store-assets/movingsupplies-moving-rope.webp'),
    ('one-bedroom-moving-kit','/store-assets/movingsupplies-one-bedroom-moving-kit.webp'),
    ('packing-paper','/store-assets/movingsupplies-packing-paper.webp'),
    ('packing-peanuts','/store-assets/movingsupplies-packing-peanuts.webp'),
    ('packing-tape','/store-assets/movingsupplies-packing-tape.webp'),
    ('permanent-markers','/store-assets/movingsupplies-permanent-markers.webp'),
    ('piano-moving-straps','/store-assets/movingsupplies-piano-moving-straps.webp'),
    ('picture-corner-kit','/store-assets/movingsupplies-picture-corner-kit.webp'),
    ('plastic-tote','/store-assets/movingsupplies-plastic-tote.webp'),
    ('queen-mattress-cover','/store-assets/movingsupplies-queen-mattress-cover.webp'),
    ('reusable-packing-crate','/store-assets/movingsupplies-reusable-packing-crate.webp'),
    ('scissors','/store-assets/movingsupplies-scissors.webp'),
    ('shrink-wrap','/store-assets/movingsupplies-shrink-wrap.webp'),
    ('small-mattress-cover','/store-assets/movingsupplies-small-mattress-cover.webp'),
    ('small-moving-box','/store-assets/movingsupplies-small-moving-box.webp'),
    ('small-office-moving-kit','/store-assets/movingsupplies-small-office-moving-kit.webp'),
    ('stretch-wrap','/store-assets/movingsupplies-stretch-wrap.webp'),
    ('studio-apartment-moving-kit','/store-assets/movingsupplies-studio-apartment-moving-kit.webp'),
    ('tape-gun-with-tape-bundle','/store-assets/movingsupplies-tape-gun-with-tape-bundle.webp'),
    ('tape-gun','/store-assets/movingsupplies-tape-gun.webp'),
    ('three-bedroom-moving-kit','/store-assets/movingsupplies-three-bedroom-moving-kit.webp'),
    ('tie-down-anchor-set','/store-assets/movingsupplies-tie-down-anchor-set.webp'),
    ('tote-dolly','/store-assets/movingsupplies-tote-dolly.webp'),
    ('tote-label-pack','/store-assets/movingsupplies-tote-label-pack.webp'),
    ('tote-lid','/store-assets/movingsupplies-tote-lid.webp'),
    ('tv-moving-box','/store-assets/movingsupplies-tv-moving-box.webp'),
    ('two-bedroom-moving-kit','/store-assets/movingsupplies-two-bedroom-moving-kit.webp'),
    ('wardrobe-box','/store-assets/movingsupplies-wardrobe-box.webp'),
    ('zip-ties','/store-assets/movingsupplies-zip-ties.webp')
)
UPDATE "ProductImage" pi SET url=generated_images.url, "altText"=p.name, "updatedAt"=CURRENT_TIMESTAMP
FROM "Product" p, generated_images
WHERE pi."productId"=p.id AND p."tenantId"=(SELECT id FROM "Tenant" WHERE slug='movingsupplies') AND p.slug=generated_images.slug;

UPDATE "Tenant" SET "brandingJson"=COALESCE("brandingJson",'{}'::jsonb)||
'{"businessType":"MOVING_SERVICES","heroHeading":"Moving Saskatchewan forward.","heroDescription":"Local and long-distance moving, Move + Hold, senior downsizing and retail delivery.","ctaText":"Get a moving quote","trustHeadline":"Professional moving services from planning through delivery.","trustCopy":"Request a quote for local, long-distance, commercial, storage-gap or last-mile work.","footerDescription":"Can-Sask Van Lines moving services, powered securely by Loadlyx.","shopMovingSuppliesUrl":"https://movingsupplies.loadlyx.com","tenantPages":[{"slug":"moving-services","title":"Moving Services","navLabel":"Moving Services","showInNav":true,"content":"Local, long-distance and commercial moving services."},{"slug":"move-and-hold","title":"Move + Hold","navLabel":"Move + Hold","showInNav":true,"content":"Coordinated moving and temporary storage for possession gaps, renovations and staged delivery."},{"slug":"retail-last-mile","title":"Retail Delivery","navLabel":"Retail Delivery","showInNav":true,"content":"Scheduled last-mile delivery for furniture, appliances and bulky retail goods."},{"slug":"reviews","title":"Reviews","navLabel":"Reviews","showInNav":true,"content":"Customer feedback and verified reviews."}]}'::jsonb,"updatedAt"=CURRENT_TIMESTAMP WHERE slug='cansask';

DO $$ DECLARE moved integer; BEGIN
 SELECT count(*) INTO moved FROM "Product" p JOIN "Tenant" t ON t.id=p."tenantId" WHERE t.slug='movingsupplies';
 IF moved=0 THEN RAISE EXCEPTION 'PRODUCT TENANT MIGRATION SAFETY BLOCKED: no products moved'; END IF;
 IF EXISTS (SELECT 1 FROM "Product" p JOIN "Tenant" t ON t.id=p."tenantId" WHERE t.slug='cansask') THEN RAISE EXCEPTION 'PRODUCT TENANT MIGRATION SAFETY BLOCKED: Can-Sask retail products remain'; END IF;
END $$;