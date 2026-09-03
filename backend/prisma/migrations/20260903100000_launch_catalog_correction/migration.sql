-- YXE was absent from the production tenant resolver during the safety snapshot.
-- This additive upsert creates the storefront only when absent and never changes an existing tenant id.
INSERT INTO "Tenant" ("id","name","slug","primaryDomain","subdomain","isActive","isMaster","isDemo","stripePolicy","stripeEnabled","paypalEnabled","subscriptionPlan","brandingJson","email","createdAt","updatedAt")
VALUES ('tenant-yxetotes-launch','YXE Totes','yxetotes','yxetotes.loadlyx.com','yxetotes',true,false,false,'DISABLED',false,false,'starter','{"businessType":"TOTE_RENTAL","city":"Saskatoon","heroHeading":"Reusable moving totes, delivered in Saskatoon","heroDescription":"Choose a clean tote package delivered approximately one week before your move and collected approximately one week after.","ctaText":"Reserve your totes","serviceArea":"Saskatoon and approved surrounding communities","rentalTerms":"Two-week minimum rental."}'::jsonb,'yxetotes@loadlyx.com',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name","primaryDomain"=COALESCE("Tenant"."primaryDomain",EXCLUDED."primaryDomain"),"subdomain"=COALESCE("Tenant"."subdomain",EXCLUDED."subdomain"),"isActive"=true,"updatedAt"=CURRENT_TIMESTAMP;
-- Tenant-scoped, idempotent catalog correction. No users, tenants, orders, carts,
-- finance, marketplace, or existing box prices are deleted or rewritten.
INSERT INTO "Category" ("id","tenantId","name","slug","description","icon","displayOrder","isEnabled","createdAt","updatedAt")
SELECT 'catalog-correction-'||t.slug||'-'||v.slug,t.id,v.name,v.slug,v.description,v.icon,v.position,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM "Tenant" t CROSS JOIN (VALUES
 ('moving-boxes','Moving Boxes','Individual moving boxes and box-focused moving kits.','BOX',10),
 ('moving-supplies','Moving Supplies','Packing, protection, securing, and organization supplies.','PACKAGE',20),
 ('hitch-accessories','Bike Racks / Hitch & Accessories','Non-electrical hitch, bike rack, and towing accessories.','TRUCK',30),
 ('vehicle-wiring','Vehicle Wiring','Trailer wiring, lighting, connectors, and brake controls.','TRUCK',40)
) v(slug,name,description,icon,position)
WHERE t.slug='cansask'
ON CONFLICT ("tenantId","slug") DO UPDATE SET "name"=EXCLUDED."name","description"=EXCLUDED."description","icon"=EXCLUDED."icon","displayOrder"=EXCLUDED."displayOrder","isEnabled"=true,"updatedAt"=CURRENT_TIMESTAMP;

-- Consolidate existing non-box merchandise into the approved primary taxonomy.
UPDATE "Product" p SET "categoryId"=target.id,"updatedAt"=CURRENT_TIMESTAMP
FROM "Tenant" t JOIN "Category" target ON target."tenantId"=t.id AND target.slug='moving-supplies'
JOIN "Category" current_category ON current_category."tenantId"=t.id
WHERE t.slug='cansask' AND p."tenantId"=t.id AND p."categoryId"=current_category.id
AND current_category.slug IN ('cargo-management','packing-supplies','supplies','reusable-moving');

UPDATE "Category" c SET "isEnabled"=false,"updatedAt"=CURRENT_TIMESTAMP
FROM "Tenant" t WHERE c."tenantId"=t.id AND t.slug='cansask'
AND c.slug NOT IN ('moving-boxes','moving-supplies','hitch-accessories','vehicle-wiring');
-- Correct categories without changing any existing product price.
UPDATE "Product" p SET "categoryId"=c.id,"updatedAt"=CURRENT_TIMESTAMP
FROM "Tenant" t,"Category" c
WHERE p."tenantId"=t.id AND c."tenantId"=t.id AND t.slug='cansask' AND c.slug='moving-supplies'
AND p.name IN ('Light-Duty Ratchet Straps','Heavy-Duty Ratchet Straps','Bungee Cord Set','Cargo Tie-Down Set','Moving Rope','Stretch Wrap','Furniture Moving Blankets','Corner Protectors','Cargo Net','Tie-Down Anchor Set','Packing Tape','Tape Gun','Tape Gun with Tape Bundle','Moving Labels','Fragile Labels','Permanent Markers','Packing Paper','Bubble Wrap','Foam Wrap','Shrink Wrap','Furniture Wrap','Box Cutter','Scissors','Packing Peanuts','Zip Ties','Small Mattress Cover','Double Mattress Cover','Queen Mattress Cover','King Mattress Cover','Sofa Cover','Chair Cover','Appliance Cover','Dust Cover','Floor Protection Film','Carpet Protector','Door Jamb Protector','Forearm Lifting Straps','Furniture Sliders','Piano Moving Straps');

WITH approved(name,slug,category_slug,price,sku) AS (VALUES
 ('Twin Mattress Bag','twin-mattress-bag','moving-supplies',1057,'CS-TWIN-MATTRESS-BAG'),
 ('Full Mattress Bag','full-mattress-bag','moving-supplies',1190,'CS-FULL-MATTRESS-BAG'),
 ('Queen Mattress Bag','queen-mattress-bag','moving-supplies',1323,'CS-QUEEN-MATTRESS-BAG'),
 ('King Mattress Bag','king-mattress-bag','moving-supplies',1456,'CS-KING-MATTRESS-BAG'),
 ('Sofa Cover','sofa-cover','moving-supplies',1057,'CS-SOFA-COVER'),
 ('Chair Cover','chair-cover','moving-supplies',1057,'CS-CHAIR-COVER'),
 ('Letter Combination Lock','letter-combination-lock','moving-supplies',1988,'CS-COMBINATION-LOCK'),
 ('Assorted Elastic Straps','assorted-elastic-straps','moving-supplies',1988,'CS-ELASTIC-STRAPS'),
 ('Bar Ratchet','bar-ratchet','moving-supplies',2321,'CS-BAR-RATCHET'),
 ('Heavy-Duty Ratchet Tie Down - 15 ft','heavy-duty-ratchet-tie-down-15-ft','moving-supplies',3584,'CS-RATCHET-15FT'),
 ('Cam Buckle / Tie Down','cam-buckle-tie-down','moving-supplies',3584,'CS-CAM-BUCKLE'),
 ('Retractable Anchor Points','retractable-anchor-points','moving-supplies',5446,'CS-ANCHOR-POINTS'),
 ('Heavy-Duty Ratchet Tie Down - 6 ft','heavy-duty-ratchet-tie-down-6-ft','moving-supplies',3052,'CS-RATCHET-6FT'),
 ('Ratchet Tie Down Set - Standard','ratchet-tie-down-set-standard','moving-supplies',4515,'CS-RATCHET-SET-STD'),
 ('Ratchet Tie Down Set - Heavy Duty','ratchet-tie-down-set-heavy-duty','moving-supplies',5313,'CS-RATCHET-SET-HD'),
 ('Towing Mirror','towing-mirror','hitch-accessories',6244,'CS-TOWING-MIRROR'),
 ('Magnetic Tow Lights','magnetic-tow-lights','vehicle-wiring',5446,'CS-MAG-TOW-LIGHTS'),
 ('Trailer Break-Away System','trailer-break-away-system','vehicle-wiring',8904,'CS-BREAK-AWAY'),
 ('Brake Controller','brake-controller','vehicle-wiring',16086,'CS-BRAKE-CONTROLLER')
)
INSERT INTO "Product" ("id","tenantId","categoryId","name","slug","description","priceCents","currency","productType","publicationStatus","sku","stock","weightKg","isActive","isFurniture","isMovingSupply","metadataJson","createdAt","updatedAt")
SELECT 'catalog-correction-'||a.sku,t.id,c.id,a.name,a.slug,'Commercial-grade '||lower(a.name)||' for moving and towing applications.',a.price,'cad','PHYSICAL'::"ProductType",'ACTIVE'::"ProductPublicationStatus",a.sku,25,1,true,false,true,'{"approvedCatalogPrice":true}'::jsonb,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM approved a JOIN "Tenant" t ON t.slug='cansask' JOIN "Category" c ON c."tenantId"=t.id AND c.slug=a.category_slug
ON CONFLICT ("tenantId","slug") DO UPDATE SET "name"=EXCLUDED."name","categoryId"=EXCLUDED."categoryId","priceCents"=EXCLUDED."priceCents","publicationStatus"='ACTIVE',"isActive"=true,"metadataJson"=EXCLUDED."metadataJson","updatedAt"=CURRENT_TIMESTAMP;

-- Demo keeps exactly five public products; other records are retained as archived.
UPDATE "Product" p SET "publicationStatus"='ARCHIVED',"isActive"=false,"updatedAt"=CURRENT_TIMESTAMP
FROM "Tenant" t WHERE p."tenantId"=t.id AND t.slug='demo' AND p.slug NOT IN ('small-moving-box','medium-moving-box','packing-tape','moving-blanket','20-tote-rental-package');

INSERT INTO "Category" ("id","tenantId","name","slug","description","icon","displayOrder","isEnabled","createdAt","updatedAt")
SELECT 'catalog-yxe-tote-rentals',t.id,'Tote Rentals','tote-rentals','Reusable moving tote packages with delivery and pickup.','PACKAGE',10,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM "Tenant" t WHERE t.slug='yxetotes'
ON CONFLICT ("tenantId","slug") DO UPDATE SET "name"=EXCLUDED."name","description"=EXCLUDED."description","isEnabled"=true,"updatedAt"=CURRENT_TIMESTAMP;

WITH packs(name,slug,weekly,minimum,units,sku,image) AS (VALUES
 ('10-Tote Rental Package','10-tote-rental-package',4900,9800,10,'YXE-TOTE-10','/store-assets/yxe-10-tote-rental-package.webp'),
 ('20-Tote Rental Package','20-tote-rental-package',8900,17800,20,'YXE-TOTE-20','/store-assets/yxe-20-tote-rental-package.webp'),
 ('30-Tote Rental Package','30-tote-rental-package',11900,23800,30,'YXE-TOTE-30','/store-assets/yxe-30-tote-rental-package.webp')
), upserted AS (
INSERT INTO "Product" ("id","tenantId","categoryId","name","slug","description","priceCents","currency","productType","publicationStatus","sku","stock","weightKg","isActive","isFurniture","isMovingSupply","metadataJson","weeklyRateCents","minimumRentalWeeks","minimumChargeCents","rentalInventoryUnits","createdAt","updatedAt")
SELECT 'catalog-'||p.sku,t.id,c.id,p.name,p.slug,p.units||' reusable moving totes. Includes a two-week minimum, with delivery approximately one week before the move and pickup approximately one week after.',p.minimum,'cad','RENTAL'::"ProductType",'ACTIVE'::"ProductPublicationStatus",p.sku,100,0,true,false,true,jsonb_build_object('toteCount',p.units,'tenantSpecific',true),p.weekly,2,p.minimum,100,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM packs p JOIN "Tenant" t ON t.slug='yxetotes' JOIN "Category" c ON c."tenantId"=t.id AND c.slug='tote-rentals'
ON CONFLICT ("tenantId","slug") DO UPDATE SET "name"=EXCLUDED."name","categoryId"=EXCLUDED."categoryId","priceCents"=EXCLUDED."priceCents","weeklyRateCents"=EXCLUDED."weeklyRateCents","minimumRentalWeeks"=2,"minimumChargeCents"=EXCLUDED."minimumChargeCents","publicationStatus"='ACTIVE',"isActive"=true,"metadataJson"=EXCLUDED."metadataJson","updatedAt"=CURRENT_TIMESTAMP RETURNING id,slug
)
INSERT INTO "ProductImage" ("id","productId","url","altText","position","createdAt","updatedAt")
SELECT 'catalog-image-'||u.id,u.id,p.image,u.slug||' reusable moving tote rental package',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM upserted u JOIN packs p ON p.slug=u.slug
ON CONFLICT ("id") DO UPDATE SET "url"=EXCLUDED."url","altText"=EXCLUDED."altText","updatedAt"=CURRENT_TIMESTAMP;

WITH demo_images(slug,url,alt) AS (VALUES
 ('small-moving-box','/store-assets/demo-small-moving-box.webp','Small moving box'),
 ('medium-moving-box','/store-assets/demo-medium-moving-box.webp','Medium moving box'),
 ('packing-tape','/store-assets/demo-packing-tape.webp','Roll of packing tape'),
 ('moving-blanket','/store-assets/demo-moving-blanket.webp','Folded quilted moving blanket'),
 ('20-tote-rental-package','/store-assets/demo-20-tote-rental-package.webp','20-tote rental package')
)
INSERT INTO "ProductImage" ("id","productId","url","altText","position","createdAt","updatedAt")
SELECT 'catalog-demo-image-'||p.id,p.id,d.url,d.alt,-10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM demo_images d JOIN "Tenant" t ON t.slug='demo' JOIN "Product" p ON p."tenantId"=t.id AND p.slug=d.slug
ON CONFLICT ("id") DO UPDATE SET "url"=EXCLUDED."url","altText"=EXCLUDED."altText","position"=-10,"updatedAt"=CURRENT_TIMESTAMP;

WITH cansask_images(slug,url) AS (VALUES
 ('twin-mattress-bag','/store-assets/cansask-twin-mattress-bag.webp'),('full-mattress-bag','/store-assets/cansask-full-mattress-bag.webp'),('queen-mattress-bag','/store-assets/cansask-queen-mattress-bag.webp'),('king-mattress-bag','/store-assets/cansask-king-mattress-bag.webp'),('sofa-cover','/store-assets/cansask-sofa-cover.webp'),('chair-cover','/store-assets/cansask-chair-cover.webp'),('letter-combination-lock','/store-assets/cansask-letter-combination-lock.webp'),('assorted-elastic-straps','/store-assets/cansask-assorted-elastic-straps.webp'),('bar-ratchet','/store-assets/cansask-bar-ratchet.webp'),('heavy-duty-ratchet-tie-down-15-ft','/store-assets/cansask-heavy-duty-ratchet-tie-down-15-ft.webp'),('cam-buckle-tie-down','/store-assets/cansask-cam-buckle-tie-down.webp'),('retractable-anchor-points','/store-assets/cansask-retractable-anchor-points.webp'),('heavy-duty-ratchet-tie-down-6-ft','/store-assets/cansask-heavy-duty-ratchet-tie-down-6-ft.webp'),('ratchet-tie-down-set-standard','/store-assets/cansask-ratchet-tie-down-set-standard.webp'),('ratchet-tie-down-set-heavy-duty','/store-assets/cansask-ratchet-tie-down-set-heavy-duty.webp'),('towing-mirror','/store-assets/cansask-towing-mirror.webp'),('magnetic-tow-lights','/store-assets/cansask-magnetic-tow-lights.webp'),('trailer-break-away-system','/store-assets/cansask-trailer-break-away-system.webp'),('brake-controller','/store-assets/cansask-brake-controller.webp')
)
INSERT INTO "ProductImage" ("id","productId","url","altText","position","createdAt","updatedAt")
SELECT 'catalog-cansask-image-'||p.id,p.id,i.url,p.name,-10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM cansask_images i JOIN "Tenant" t ON t.slug='cansask' JOIN "Product" p ON p."tenantId"=t.id AND p.slug=i.slug
ON CONFLICT ("id") DO UPDATE SET "url"=EXCLUDED."url","altText"=EXCLUDED."altText","position"=-10,"updatedAt"=CURRENT_TIMESTAMP;
