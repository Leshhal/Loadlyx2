ALTER TABLE "Category"
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "icon" TEXT,
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Product"
  ADD COLUMN "weeklyRateCents" INTEGER,
  ADD COLUMN "minimumRentalWeeks" INTEGER,
  ADD COLUMN "minimumChargeCents" INTEGER,
  ADD COLUMN "rentalInventoryUnits" INTEGER;

ALTER TABLE "ConnectionEvent"
  ADD COLUMN "ipAddressEncrypted" TEXT,
  ADD COLUMN "deviceType" TEXT,
  ADD COLUMN "operatingSystem" TEXT,
  ADD COLUMN "browser" TEXT,
  ADD COLUMN "sessionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "successful" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "riskLevel" TEXT NOT NULL DEFAULT 'LOW';

CREATE TABLE "ProductBadge" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT,
  "categoryId" TEXT,
  "label" TEXT NOT NULL,
  "badgeType" TEXT NOT NULL,
  "percentage" INTEGER,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "displayPriority" INTEGER NOT NULL DEFAULT 0,
  "tooltip" TEXT,
  "eligibilityJson" JSONB,
  "isGlobalTemplate" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductBadge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProductBadge_tenantId_enabled_displayPriority_idx" ON "ProductBadge"("tenantId", "enabled", "displayPriority");
CREATE INDEX "ProductBadge_productId_idx" ON "ProductBadge"("productId");
CREATE INDEX "ProductBadge_categoryId_idx" ON "ProductBadge"("categoryId");
ALTER TABLE "ProductBadge" ADD CONSTRAINT "ProductBadge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductBadge" ADD CONSTRAINT "ProductBadge_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductBadge" ADD CONSTRAINT "ProductBadge_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RentalBooking" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "orderId" TEXT,
  "customerEmail" TEXT NOT NULL,
  "moveDate" TIMESTAMP(3) NOT NULL,
  "deliveryDate" TIMESTAMP(3) NOT NULL,
  "pickupDate" TIMESTAMP(3) NOT NULL,
  "rentalWeeks" INTEGER NOT NULL,
  "packageQuantity" INTEGER NOT NULL DEFAULT 1,
  "reservedToteUnits" INTEGER NOT NULL,
  "weeklyRateCents" INTEGER NOT NULL,
  "minimumChargeCents" INTEGER NOT NULL,
  "totalCents" INTEGER NOT NULL,
  "deliveryAddressJson" JSONB NOT NULL,
  "serviceArea" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "contractSnapshotJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentalBooking_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RentalBooking_tenantId_deliveryDate_pickupDate_idx" ON "RentalBooking"("tenantId", "deliveryDate", "pickupDate");
CREATE INDEX "RentalBooking_productId_status_idx" ON "RentalBooking"("productId", "status");
CREATE INDEX "RentalBooking_orderId_idx" ON "RentalBooking"("orderId");
ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SecurityBlock" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "targetType" TEXT NOT NULL,
  "targetValueHash" TEXT NOT NULL,
  "targetDisplay" TEXT,
  "userId" TEXT,
  "sessionHash" TEXT,
  "reason" TEXT NOT NULL,
  "warningAccepted" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "SecurityBlock_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SecurityBlock_targetType_targetValueHash_active_idx" ON "SecurityBlock"("targetType", "targetValueHash", "active");
CREATE INDEX "SecurityBlock_userId_active_idx" ON "SecurityBlock"("userId", "active");
CREATE INDEX "SecurityBlock_expiresAt_idx" ON "SecurityBlock"("expiresAt");
ALTER TABLE "SecurityBlock" ADD CONSTRAINT "SecurityBlock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecurityBlock" ADD CONSTRAINT "SecurityBlock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TenantShippingConfig" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
  "originPostalCode" TEXT,
  "originCountry" TEXT NOT NULL DEFAULT 'CA',
  "handlingFeeCents" INTEGER NOT NULL DEFAULT 0,
  "markupBasisPoints" INTEGER NOT NULL DEFAULT 0,
  "flatRateCents" INTEGER,
  "settingsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantShippingConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TenantShippingConfig_tenantId_provider_key" ON "TenantShippingConfig"("tenantId", "provider");
CREATE INDEX "TenantShippingConfig_tenantId_enabled_idx" ON "TenantShippingConfig"("tenantId", "enabled");
ALTER TABLE "TenantShippingConfig" ADD CONSTRAINT "TenantShippingConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ShippingQuote" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "cacheKey" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "serviceName" TEXT NOT NULL,
  "serviceCode" TEXT NOT NULL,
  "rateCents" INTEGER NOT NULL,
  "handlingFeeCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'cad',
  "estimatedTransitDays" INTEGER,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "requestSnapshotJson" JSONB NOT NULL,
  "responseSnapshotJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShippingQuote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShippingQuote_tenantId_cacheKey_expiresAt_idx" ON "ShippingQuote"("tenantId", "cacheKey", "expiresAt");
ALTER TABLE "ShippingQuote" ADD CONSTRAINT "ShippingQuote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
