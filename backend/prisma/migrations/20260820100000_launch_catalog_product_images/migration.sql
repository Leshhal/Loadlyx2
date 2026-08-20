-- Give every seeded CanSask and Demo catalog product a category-appropriate
-- launch image. Existing tenant-uploaded product images always take priority.
INSERT INTO "ProductImage" (
  "id",
  "productId",
  "url",
  "altText",
  "position",
  "createdAt",
  "updatedAt"
)
SELECT
  'launch-image-' || p."id",
  p."id",
  '/store-assets/' || c."slug" || '.webp',
  p."name" || ' - ' || c."name",
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Product" p
JOIN "Tenant" t ON t."id" = p."tenantId"
JOIN "Category" c ON c."id" = p."categoryId"
WHERE t."slug" IN ('cansask', 'demo')
  AND p."isActive" = true
  AND p."publicationStatus" = 'ACTIVE'
  AND c."slug" IN ('moving-boxes', 'cargo-management', 'packing-supplies', 'reusable-moving')
  AND NOT EXISTS (
    SELECT 1
    FROM "ProductImage" existing
    WHERE existing."productId" = p."id"
  )
ON CONFLICT ("id") DO NOTHING;
