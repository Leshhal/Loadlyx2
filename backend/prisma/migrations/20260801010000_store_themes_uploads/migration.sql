CREATE TYPE "StoreThemeStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'DISABLED', 'DEPRECATED');
CREATE TYPE "MediaStorageProvider" AS ENUM ('LOCAL', 'HTTP', 'VERCEL_BLOB', 'CLOUDINARY', 'S3', 'SUPABASE');

CREATE TABLE "StoreTheme" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "version" TEXT NOT NULL DEFAULT '1.0.0',
  "compatibilityVersion" TEXT NOT NULL DEFAULT '1',
  "status" "StoreThemeStatus" NOT NULL DEFAULT 'DRAFT',
  "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
  "previewImageUrl" TEXT,
  "manifestJson" JSONB NOT NULL,
  "uploadedByTenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreTheme_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantThemeActivation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "themeId" TEXT NOT NULL,
  "previousThemeId" TEXT,
  "settingsJson" JSONB NOT NULL,
  "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantThemeActivation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "provider" "MediaStorageProvider" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "originalName" TEXT,
  "altText" TEXT,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "checksum" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'READY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductImage" ADD COLUMN "assetId" TEXT;

CREATE UNIQUE INDEX "StoreTheme_key_key" ON "StoreTheme"("key");
CREATE INDEX "StoreTheme_status_isBuiltIn_idx" ON "StoreTheme"("status", "isBuiltIn");
CREATE INDEX "StoreTheme_uploadedByTenantId_idx" ON "StoreTheme"("uploadedByTenantId");
CREATE UNIQUE INDEX "TenantThemeActivation_tenantId_key" ON "TenantThemeActivation"("tenantId");
CREATE INDEX "TenantThemeActivation_themeId_idx" ON "TenantThemeActivation"("themeId");
CREATE INDEX "TenantThemeActivation_previousThemeId_idx" ON "TenantThemeActivation"("previousThemeId");
CREATE UNIQUE INDEX "MediaAsset_provider_storageKey_key" ON "MediaAsset"("provider", "storageKey");
CREATE INDEX "MediaAsset_tenantId_createdAt_idx" ON "MediaAsset"("tenantId", "createdAt");
CREATE INDEX "ProductImage_assetId_idx" ON "ProductImage"("assetId");

ALTER TABLE "StoreTheme" ADD CONSTRAINT "StoreTheme_uploadedByTenantId_fkey" FOREIGN KEY ("uploadedByTenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenantThemeActivation" ADD CONSTRAINT "TenantThemeActivation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantThemeActivation" ADD CONSTRAINT "TenantThemeActivation_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "StoreTheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantThemeActivation" ADD CONSTRAINT "TenantThemeActivation_previousThemeId_fkey" FOREIGN KEY ("previousThemeId") REFERENCES "StoreTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "StoreTheme" ("id", "key", "name", "description", "version", "compatibilityVersion", "status", "isBuiltIn", "manifestJson", "updatedAt") VALUES
('theme_loadlyx_classic', 'loadlyx-classic', 'Loadlyx Classic', 'Balanced storefront for moving and logistics businesses.', '1.0.0', '1', 'APPROVED', true, '{"layout":"classic","tokens":{"primaryColor":"#2f6df6","accentColor":"#f2b843","fontFamily":"system","buttonRadius":"12px","pageWidth":"1200px"},"sections":["hero","trust","products","customPages"]}'::jsonb, CURRENT_TIMESTAMP),
('theme_loadlyx_modern', 'loadlyx-modern', 'Loadlyx Modern', 'High-contrast storefront with compact product presentation.', '1.0.0', '1', 'APPROVED', true, '{"layout":"modern","tokens":{"primaryColor":"#7c3aed","accentColor":"#22d3ee","fontFamily":"system","buttonRadius":"18px","pageWidth":"1320px"},"sections":["hero","products","trust","customPages"]}'::jsonb, CURRENT_TIMESTAMP),
('theme_loadlyx_warm', 'loadlyx-warm', 'Loadlyx Warm', 'Friendly storefront for local moving and supply brands.', '1.0.0', '1', 'APPROVED', true, '{"layout":"warm","tokens":{"primaryColor":"#c2410c","accentColor":"#fbbf24","fontFamily":"system","buttonRadius":"8px","pageWidth":"1160px"},"sections":["hero","trust","customPages","products"]}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
