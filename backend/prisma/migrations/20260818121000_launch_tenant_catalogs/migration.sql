UPDATE "Tenant"
SET "brandingJson" = COALESCE("brandingJson", '{}'::jsonb) || '{"brandName":"Can-Sask Van Lines","primaryColor":"#163f36","accentColor":"#d3a62b","heroHeading":"Moving Saskatchewan forward.","heroDescription":"Local and long-distance moving, Move + Hold storage, senior downsizing, retail last-mile delivery, and professional moving supplies.","ctaText":"Get a moving quote","serviceArea":"Saskatoon, Saskatchewan and interprovincial routes","contactEmail":"saskmoves@gmail.com","trustHeadline":"A practical moving partner from first box to final delivery.","trustCopy":"Plan services, request a quote, and shop moving essentials in one local storefront.","footerDescription":"Can-Sask Van Lines moving services and supplies, powered securely by Loadlyx.","tenantPages":[{"slug":"moving-services","title":"Moving Services","navLabel":"Services","showInNav":true,"content":"Local moving\nLong-distance moving\nCommercial and office relocations\nPacking and moving supplies\nRequest a detailed quote to plan dates, inventory, access, and service requirements."},{"slug":"move-and-hold","title":"Move + Hold","navLabel":"Move + Hold","showInNav":true,"content":"A coordinated moving and temporary storage option for closings, renovations, possession gaps, and staged deliveries. Request a quote so the team can review timing, access, and storage needs."},{"slug":"senior-downsizing","title":"Senior Downsizing","showInNav":false,"content":"Patient planning for downsizing moves, including inventory review, packing coordination, staged delivery, and family communication."},{"slug":"retail-last-mile","title":"Retail Last-Mile Delivery","showInNav":false,"content":"Scheduled final-mile delivery support for furniture, appliances, and bulky retail goods. Contact Can-Sask for service-area and capacity confirmation."}]}'::jsonb
WHERE "slug" = 'cansask';

UPDATE "Tenant"
SET "isDemo" = true,
    "brandingJson" = COALESCE("brandingJson", '{}'::jsonb) || '{"brandName":"Loadlyx Sales Demo","primaryColor":"#2457f5","accentColor":"#53dfbf","heroHeading":"See a polished moving storefront in action.","heroDescription":"Explore five sample products and the customer journey without creating real payments, payouts, or financial reporting.","ctaText":"Explore demo products","serviceArea":"Synthetic demonstration only","trustHeadline":"A safe, clearly labeled sales environment.","trustCopy":"All products, activity, and metrics are demonstration data.","footerDescription":"Loadlyx demonstration storefront. No real transactions are processed.","tenantPages":[{"slug":"about-this-demo","title":"About This Demo","navLabel":"Demo Guide","showInNav":true,"content":"This tenant is a synthetic sales demonstration. Checkout and real money movement are disabled, and demo data is excluded from production financial reporting."}]}'::jsonb
WHERE "slug" = 'demo';

INSERT INTO "Category" ("id","tenantId","name","slug","description","icon","displayOrder","isEnabled","createdAt","updatedAt")
SELECT 'launch-cat-' || t.slug || '-' || v.slug, t.id, v.name, v.slug, v.description, v.icon, v.position, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t CROSS JOIN (VALUES
 ('moving-boxes','Moving Boxes','Boxes and complete packing kits.','BOX',10),
 ('cargo-management','Cargo Management','Tie-downs, blankets, dollies, and cargo protection.','TRUCK',20),
 ('packing-supplies','Packing Supplies','Tape, wrap, labels, covers, and protection.','PACKAGE',30),
 ('reusable-moving','Reusable Moving','Reusable totes, crates, and accessories.','PACKAGE',40)
) AS v(slug,name,description,icon,position)
WHERE t.slug IN ('cansask','demo')
ON CONFLICT ("tenantId","slug") DO UPDATE SET "name"=EXCLUDED."name", "description"=EXCLUDED."description", "icon"=EXCLUDED."icon", "displayOrder"=EXCLUDED."displayOrder", "isEnabled"=true, "updatedAt"=CURRENT_TIMESTAMP;

WITH names(name, category_slug, position) AS (VALUES
 ('Small Moving Box','moving-boxes',1),('Medium Moving Box','moving-boxes',2),('Large Moving Box','moving-boxes',3),('Extra-Large Moving Box','moving-boxes',4),('Wardrobe Box','moving-boxes',5),('Dish Pack Box','moving-boxes',6),('File Box','moving-boxes',7),('Mirror and Picture Box','moving-boxes',8),('TV Moving Box','moving-boxes',9),('Lamp Box','moving-boxes',10),
 ('Studio Apartment Moving Kit','moving-boxes',11),('One-Bedroom Moving Kit','moving-boxes',12),('Two-Bedroom Moving Kit','moving-boxes',13),('Three-Bedroom Moving Kit','moving-boxes',14),('Four-Bedroom Moving Kit','moving-boxes',15),('Small Office Moving Kit','moving-boxes',16),('Kitchen Packing Kit','moving-boxes',17),('Fragile Item Packing Kit','moving-boxes',18),
 ('Light-Duty Ratchet Straps','cargo-management',19),('Heavy-Duty Ratchet Straps','cargo-management',20),('Bungee Cord Set','cargo-management',21),('Cargo Tie-Down Set','cargo-management',22),('Moving Rope','cargo-management',23),('Stretch Wrap','cargo-management',24),('Furniture Moving Blankets','cargo-management',25),('Corner Protectors','cargo-management',26),('Cargo Net','cargo-management',27),('Tie-Down Anchor Set','cargo-management',28),
 ('Packing Tape','packing-supplies',29),('Tape Gun','packing-supplies',30),('Tape Gun with Tape Bundle','packing-supplies',31),('Moving Labels','packing-supplies',32),('Fragile Labels','packing-supplies',33),('Permanent Markers','packing-supplies',34),('Packing Paper','packing-supplies',35),('Bubble Wrap','packing-supplies',36),('Foam Wrap','packing-supplies',37),('Shrink Wrap','packing-supplies',38),('Furniture Wrap','packing-supplies',39),('Box Cutter','packing-supplies',40),('Scissors','packing-supplies',41),('Packing Peanuts','packing-supplies',42),('Zip Ties','packing-supplies',43),('Small Mattress Cover','packing-supplies',44),('Double Mattress Cover','packing-supplies',45),('Queen Mattress Cover','packing-supplies',46),('King Mattress Cover','packing-supplies',47),('Sofa Cover','packing-supplies',48),('Chair Cover','packing-supplies',49),('Appliance Cover','packing-supplies',50),('Dust Cover','packing-supplies',51),('Floor Protection Film','packing-supplies',52),('Carpet Protector','packing-supplies',53),('Door Jamb Protector','packing-supplies',54),
 ('Moving Dolly','cargo-management',55),('Furniture Dolly','cargo-management',56),('Hand Truck','cargo-management',57),('Forearm Lifting Straps','cargo-management',58),('Furniture Sliders','cargo-management',59),('Piano Moving Straps','cargo-management',60),
 ('Plastic Tote','reusable-moving',61),('Tote Lid','reusable-moving',62),('Tote Dolly','reusable-moving',63),('Tote Label Pack','reusable-moving',64),('Reusable Packing Crate','reusable-moving',65),('Hanging File Crate','reusable-moving',66),('Glass Divider Kit','reusable-moving',67),('Dish Cell Kit','reusable-moving',68),('Picture Corner Kit','reusable-moving',69),('Moving Day Essentials Bundle','reusable-moving',70)
), normalized AS (
 SELECT name, category_slug, position, trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) AS slug FROM names
)
INSERT INTO "Product" ("id","tenantId","categoryId","name","slug","description","priceCents","currency","productType","publicationStatus","sku","stock","weightKg","isActive","isFurniture","isMovingSupply","metadataJson","createdAt","updatedAt")
SELECT 'launch-product-cansask-' || n.position, t.id, c.id, n.name, n.slug,
 'Professional ' || lower(n.name) || ' for safer, more organized moves.',
 CASE WHEN n.name LIKE '%Kit' OR n.name LIKE '%Bundle' THEN 9999 ELSE 1499 END, 'cad',
 CASE WHEN n.name LIKE '%Kit' OR n.name LIKE '%Bundle' THEN 'BUNDLE'::"ProductType" ELSE 'PHYSICAL'::"ProductType" END,
 'ACTIVE'::"ProductPublicationStatus", 'CS-' || upper(left(n.slug,28)), 50, 1, true, false, true, '{"launchCatalog":true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t JOIN normalized n ON true JOIN "Category" c ON c."tenantId"=t.id AND c.slug=n.category_slug
WHERE t.slug='cansask'
ON CONFLICT ("tenantId","slug") DO UPDATE SET "categoryId"=EXCLUDED."categoryId", "isActive"=true, "publicationStatus"='ACTIVE', "updatedAt"=CURRENT_TIMESTAMP;

WITH demo(name,slug,category_slug,price,kind,position) AS (VALUES
 ('Small Moving Box','small-moving-box','moving-boxes',299,'PHYSICAL'::"ProductType",1),
 ('Medium Moving Box','medium-moving-box','moving-boxes',449,'PHYSICAL'::"ProductType",2),
 ('Packing Tape','packing-tape','packing-supplies',699,'PHYSICAL'::"ProductType",3),
 ('Moving Blanket','moving-blanket','cargo-management',1999,'PHYSICAL'::"ProductType",4),
 ('20-Tote Rental Package','20-tote-rental-package','reusable-moving',17800,'RENTAL'::"ProductType",5)
)
INSERT INTO "Product" ("id","tenantId","categoryId","name","slug","description","priceCents","currency","productType","publicationStatus","sku","stock","weightKg","isActive","isFurniture","isMovingSupply","metadataJson","weeklyRateCents","minimumRentalWeeks","minimumChargeCents","rentalInventoryUnits","createdAt","updatedAt")
SELECT 'launch-product-demo-'||d.position,t.id,c.id,d.name,d.slug,'Synthetic demo product. No real purchase or payout is created.',d.price,'cad',d.kind,'ACTIVE'::"ProductPublicationStatus",'DEMO-'||d.position,50,1,true,false,true,'{"isDemo":true}'::jsonb,CASE WHEN d.kind='RENTAL' THEN 8900 END,CASE WHEN d.kind='RENTAL' THEN 2 END,CASE WHEN d.kind='RENTAL' THEN 17800 END,CASE WHEN d.kind='RENTAL' THEN 100 END,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM "Tenant" t JOIN demo d ON true JOIN "Category" c ON c."tenantId"=t.id AND c.slug=d.category_slug
WHERE t.slug='demo'
ON CONFLICT ("tenantId","slug") DO UPDATE SET "categoryId"=EXCLUDED."categoryId", "name"=EXCLUDED."name", "priceCents"=EXCLUDED."priceCents", "productType"=EXCLUDED."productType", "isActive"=true, "metadataJson"=EXCLUDED."metadataJson", "updatedAt"=CURRENT_TIMESTAMP;
