-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PHYSICAL', 'RENTAL', 'SERVICE_ADD_ON', 'BUNDLE');

-- CreateEnum
CREATE TYPE "ProductPublicationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MarketplaceOfferAction" AS ENUM ('CREATED', 'SUBMITTED', 'VIEWED', 'UPDATED', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'SUPERSEDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MarketplaceTransactionStatus" AS ENUM ('DRAFT', 'OFFER_ACCEPTED', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'FUNDED', 'PAYMENT_FAILED', 'IN_PROGRESS', 'DELIVERY_REPORTED', 'DELIVERY_CONFIRMATION_PENDING', 'DELIVERED', 'DISPUTED', 'PAYOUT_PENDING', 'PAYOUT_PROCESSING', 'PAID_OUT', 'PAYOUT_FAILED', 'CANCELLED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CHARGEBACK');

-- CreateEnum
CREATE TYPE "PayoutEligibilityStatus" AS ENUM ('NOT_STARTED', 'INFORMATION_REQUIRED', 'UNDER_REVIEW', 'VERIFIED', 'RESTRICTED', 'SUSPENDED', 'PAYOUTS_ENABLED', 'PAYOUTS_DISABLED');

-- CreateEnum
CREATE TYPE "TrustRiskBand" AS ENUM ('LOW_RISK', 'MODERATE_RISK', 'ELEVATED_RISK', 'HIGH_RISK', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "WebsiteContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MarketplaceBidStatus" ADD VALUE 'DRAFT';
ALTER TYPE "MarketplaceBidStatus" ADD VALUE 'VIEWED';
ALTER TYPE "MarketplaceBidStatus" ADD VALUE 'COUNTERED';
ALTER TYPE "MarketplaceBidStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "MarketplaceBidStatus" ADD VALUE 'SUPERSEDED';
ALTER TYPE "MarketplaceBidStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'cad',
ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'PHYSICAL',
ADD COLUMN     "publicationStatus" "ProductPublicationStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "salePriceCents" INTEGER;

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "annualPriceCents" INTEGER,
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "entitlementsJson" JSONB,
ADD COLUMN     "grandfatherExisting" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "WithdrawalRequest" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'cad',
ADD COLUMN     "destinationRef" TEXT,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "payoutMethod" TEXT,
ADD COLUMN     "providerPayoutId" TEXT,
ADD COLUMN     "requestedByUserId" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByUserId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "MarketplaceLoad" ADD COLUMN     "category" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'cad',
ADD COLUMN     "dimensionsJson" JSONB,
ADD COLUMN     "documentUrls" JSONB,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "imageUrls" JSONB,
ADD COLUMN     "specialHandling" TEXT,
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "volumeCubicM" DECIMAL(12,3);

-- AlterTable
ALTER TABLE "MarketplaceBid" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "conditions" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'cad',
ADD COLUMN     "equipment" TEXT,
ADD COLUMN     "estimatedDelivery" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "pickupAvailability" TIMESTAMP(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "viewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "priceCents" INTEGER NOT NULL,
    "salePriceCents" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "optionsJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCollection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductCollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreCart" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionKey" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'cad',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreCartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceOfferHistory" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" "MarketplaceOfferAction" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'cad',
    "message" TEXT,
    "conditions" TEXT,
    "snapshotJson" JSONB NOT NULL,
    "parentEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceOfferHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceTransaction" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "posterId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "status" "MarketplaceTransactionStatus" NOT NULL DEFAULT 'OFFER_ACCEPTED',
    "provider" TEXT NOT NULL DEFAULT 'STRIPE',
    "providerPaymentId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'cad',
    "grossCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "processorFeeCents" INTEGER NOT NULL DEFAULT 0,
    "platformFeeCents" INTEGER NOT NULL,
    "providerNetCents" INTEGER NOT NULL,
    "feeRuleSnapshotJson" JSONB NOT NULL,
    "agreementSnapshotJson" JSONB NOT NULL,
    "riskHold" BOOLEAN NOT NULL DEFAULT false,
    "riskHoldReason" TEXT,
    "fundedAt" TIMESTAMP(3),
    "deliveryReportedAt" TIMESTAMP(3),
    "deliveryConfirmedAt" TIMESTAMP(3),
    "deliveryConfirmedById" TEXT,
    "settlementAvailableAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplacePayout" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerPayoutId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'cad',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL,
    "initiatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplacePayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceFeeRule" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "percentageBps" INTEGER NOT NULL,
    "fixedFeeCents" INTEGER NOT NULL DEFAULT 0,
    "minimumFeeCents" INTEGER NOT NULL DEFAULT 0,
    "maximumFeeCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'cad',
    "version" INTEGER NOT NULL,
    "taxTreatment" TEXT NOT NULL DEFAULT 'EXCLUSIVE',
    "refundTreatment" TEXT NOT NULL DEFAULT 'PRO_RATA',
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceFeeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderPayoutProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "legalName" TEXT,
    "businessName" TEXT,
    "country" TEXT,
    "contactJson" JSONB,
    "taxInformationStatus" TEXT,
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "businessVerified" BOOLEAN NOT NULL DEFAULT false,
    "insuranceVerified" BOOLEAN NOT NULL DEFAULT false,
    "complianceStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "connectedAccountId" TEXT,
    "payoutMethod" TEXT,
    "status" "PayoutEligibilityStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "missingRequirements" JSONB,
    "termsAcceptedAt" TIMESTAMP(3),
    "marketplaceAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderPayoutProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceTrustScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "riskBand" "TrustRiskBand" NOT NULL,
    "version" INTEGER NOT NULL,
    "publicFactorsJson" JSONB NOT NULL,
    "privateFactorsJson" JSONB NOT NULL,
    "triggeredRulesJson" JSONB,
    "payoutHold" BOOLEAN NOT NULL DEFAULT false,
    "investigationStatus" TEXT,
    "overriddenById" TEXT,
    "overrideReason" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceTrustScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteContentVersion" (
    "id" TEXT NOT NULL,
    "contentKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "WebsiteContentStatus" NOT NULL DEFAULT 'DRAFT',
    "contentJson" JSONB NOT NULL,
    "updatedById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteContentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteSocialLink" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "openNewTab" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteSocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductVariant_productId_isActive_idx" ON "ProductVariant"("productId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_sku_key" ON "ProductVariant"("productId", "sku");

-- CreateIndex
CREATE INDEX "ProductCollection_tenantId_isActive_idx" ON "ProductCollection"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCollection_tenantId_slug_key" ON "ProductCollection"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "ProductCollectionItem_productId_idx" ON "ProductCollectionItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCollectionItem_collectionId_productId_key" ON "ProductCollectionItem"("collectionId", "productId");

-- CreateIndex
CREATE INDEX "StoreCart_expiresAt_idx" ON "StoreCart"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoreCart_tenantId_userId_key" ON "StoreCart"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreCart_tenantId_sessionKey_key" ON "StoreCart"("tenantId", "sessionKey");

-- CreateIndex
CREATE INDEX "StoreCartItem_productId_idx" ON "StoreCartItem"("productId");

-- CreateIndex
CREATE INDEX "StoreCartItem_variantId_idx" ON "StoreCartItem"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreCartItem_cartId_productId_variantId_key" ON "StoreCartItem"("cartId", "productId", "variantId");

-- CreateIndex
CREATE INDEX "MarketplaceOfferHistory_offerId_createdAt_idx" ON "MarketplaceOfferHistory"("offerId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceOfferHistory_actorUserId_createdAt_idx" ON "MarketplaceOfferHistory"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceTransaction_idempotencyKey_key" ON "MarketplaceTransaction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceTransaction_loadId_key" ON "MarketplaceTransaction"("loadId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceTransaction_offerId_key" ON "MarketplaceTransaction"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceTransaction_providerPaymentId_key" ON "MarketplaceTransaction"("providerPaymentId");

-- CreateIndex
CREATE INDEX "MarketplaceTransaction_posterId_status_idx" ON "MarketplaceTransaction"("posterId", "status");

-- CreateIndex
CREATE INDEX "MarketplaceTransaction_providerId_status_idx" ON "MarketplaceTransaction"("providerId", "status");

-- CreateIndex
CREATE INDEX "MarketplaceTransaction_status_settlementAvailableAt_idx" ON "MarketplaceTransaction"("status", "settlementAvailableAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplacePayout_transactionId_key" ON "MarketplacePayout"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplacePayout_idempotencyKey_key" ON "MarketplacePayout"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplacePayout_providerPayoutId_key" ON "MarketplacePayout"("providerPayoutId");

-- CreateIndex
CREATE INDEX "MarketplacePayout_status_availableAt_idx" ON "MarketplacePayout"("status", "availableAt");

-- CreateIndex
CREATE INDEX "MarketplaceFeeRule_accountType_isActive_effectiveAt_idx" ON "MarketplaceFeeRule"("accountType", "isActive", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceFeeRule_scopeKey_version_key" ON "MarketplaceFeeRule"("scopeKey", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderPayoutProfile_userId_key" ON "ProviderPayoutProfile"("userId");

-- CreateIndex
CREATE INDEX "ProviderPayoutProfile_status_idx" ON "ProviderPayoutProfile"("status");

-- CreateIndex
CREATE INDEX "MarketplaceTrustScore_riskBand_payoutHold_idx" ON "MarketplaceTrustScore"("riskBand", "payoutHold");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceTrustScore_userId_version_key" ON "MarketplaceTrustScore"("userId", "version");

-- CreateIndex
CREATE INDEX "WebsiteContentVersion_contentKey_status_version_idx" ON "WebsiteContentVersion"("contentKey", "status", "version");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteContentVersion_contentKey_version_key" ON "WebsiteContentVersion"("contentKey", "version");

-- CreateIndex
CREATE INDEX "WebsiteSocialLink_enabled_displayOrder_idx" ON "WebsiteSocialLink"("enabled", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteSocialLink_platform_displayLabel_key" ON "WebsiteSocialLink"("platform", "displayLabel");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalRequest_idempotencyKey_key" ON "WithdrawalRequest"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalRequest_providerPayoutId_key" ON "WithdrawalRequest"("providerPayoutId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_tenantId_status_createdAt_idx" ON "WithdrawalRequest"("tenantId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollectionItem" ADD CONSTRAINT "ProductCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ProductCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollectionItem" ADD CONSTRAINT "ProductCollectionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreCartItem" ADD CONSTRAINT "StoreCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "StoreCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOfferHistory" ADD CONSTRAINT "MarketplaceOfferHistory_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "MarketplaceBid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplacePayout" ADD CONSTRAINT "MarketplacePayout_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "MarketplaceTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

