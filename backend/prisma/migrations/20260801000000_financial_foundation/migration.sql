CREATE TYPE "SubscriptionPlanCode" AS ENUM ('STARTER', 'GROWTH', 'PROFESSIONAL');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');
CREATE TYPE "FinancialTransactionKind" AS ENUM ('SAAS_SUBSCRIPTION', 'STORE_SALE', 'MARKETPLACE_DEAL', 'REFUND', 'CHARGEBACK', 'ADJUSTMENT', 'PAYOUT');
CREATE TYPE "FinancialTransactionStatus" AS ENUM ('PENDING', 'AVAILABLE', 'HELD', 'SETTLED', 'REVERSED', 'FAILED');
CREATE TYPE "LedgerAccount" AS ENUM ('PLATFORM', 'TENANT', 'BROKER', 'CARRIER', 'PROCESSOR', 'TAX_PAYABLE', 'CUSTOMER');
CREATE TYPE "LedgerEntryType" AS ENUM ('SAAS_REVENUE', 'STORE_COMMISSION', 'MARKETPLACE_COMMISSION', 'TENANT_PROCEEDS', 'BROKER_MARGIN', 'CARRIER_PROCEEDS', 'PROCESSOR_FEE', 'TAX', 'REFUND', 'CHARGEBACK', 'ADJUSTMENT', 'PAYOUT', 'PAYOUT_REVERSAL');
CREATE TYPE "LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');

CREATE TABLE "CommissionPolicy" (
  "id" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "tenantId" TEXT,
  "storeCommissionBps" INTEGER NOT NULL DEFAULT 800,
  "marketplaceCommissionBps" INTEGER NOT NULL DEFAULT 700,
  "minimumMarketplaceFeeCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommissionPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommissionPolicy_rates_check" CHECK (
    "storeCommissionBps" BETWEEN 0 AND 10000 AND
    "marketplaceCommissionBps" BETWEEN 0 AND 10000 AND
    "minimumMarketplaceFeeCents" >= 0
  )
);

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "planCode" "SubscriptionPlanCode" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "monthlyPriceCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'cad',
  "providerCustomerId" TEXT,
  "providerSubscriptionId" TEXT,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subscription_price_check" CHECK ("monthlyPriceCents" >= 0)
);

CREATE TABLE "SubscriptionPlan" (
  "id" TEXT NOT NULL,
  "code" "SubscriptionPlanCode" NOT NULL,
  "name" TEXT NOT NULL,
  "monthlyPriceCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'cad',
  "featuresJson" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubscriptionPlan_price_check" CHECK ("monthlyPriceCents" >= 0)
);

CREATE TABLE "FinancialTransaction" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "tenantId" TEXT,
  "kind" "FinancialTransactionKind" NOT NULL,
  "status" "FinancialTransactionStatus" NOT NULL DEFAULT 'PENDING',
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'cad',
  "grossCents" INTEGER NOT NULL,
  "taxCents" INTEGER NOT NULL DEFAULT 0,
  "discountCents" INTEGER NOT NULL DEFAULT 0,
  "processorFeeCents" INTEGER NOT NULL DEFAULT 0,
  "platformCommissionCents" INTEGER NOT NULL DEFAULT 0,
  "brokerMarginCents" INTEGER NOT NULL DEFAULT 0,
  "tenantProceedsCents" INTEGER NOT NULL DEFAULT 0,
  "providerProceedsCents" INTEGER NOT NULL DEFAULT 0,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "availableAt" TIMESTAMP(3),
  "settledAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinancialTransaction_amounts_check" CHECK (
    "grossCents" >= 0 AND "taxCents" >= 0 AND "discountCents" >= 0 AND
    "processorFeeCents" >= 0 AND "platformCommissionCents" >= 0 AND
    "brokerMarginCents" >= 0 AND "tenantProceedsCents" >= 0 AND
    "providerProceedsCents" >= 0
  )
);

CREATE TABLE "LedgerEntry" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "tenantId" TEXT,
  "account" "LedgerAccount" NOT NULL,
  "entryType" "LedgerEntryType" NOT NULL,
  "direction" "LedgerDirection" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'cad',
  "idempotencyKey" TEXT NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LedgerEntry_amount_check" CHECK ("amountCents" >= 0)
);

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "tenantId" TEXT,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommissionPolicy_scopeKey_key" ON "CommissionPolicy"("scopeKey");
CREATE UNIQUE INDEX "CommissionPolicy_tenantId_key" ON "CommissionPolicy"("tenantId");
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_planCode_idx" ON "Subscription"("planCode");
CREATE UNIQUE INDEX "FinancialTransaction_idempotencyKey_key" ON "FinancialTransaction"("idempotencyKey");
CREATE INDEX "FinancialTransaction_tenantId_status_idx" ON "FinancialTransaction"("tenantId", "status");
CREATE INDEX "FinancialTransaction_kind_status_idx" ON "FinancialTransaction"("kind", "status");
CREATE INDEX "FinancialTransaction_referenceType_referenceId_idx" ON "FinancialTransaction"("referenceType", "referenceId");
CREATE INDEX "FinancialTransaction_createdAt_idx" ON "FinancialTransaction"("createdAt");
CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key" ON "LedgerEntry"("idempotencyKey");
CREATE INDEX "LedgerEntry_transactionId_idx" ON "LedgerEntry"("transactionId");
CREATE INDEX "LedgerEntry_tenantId_account_idx" ON "LedgerEntry"("tenantId", "account");
CREATE INDEX "LedgerEntry_entryType_createdAt_idx" ON "LedgerEntry"("entryType", "createdAt");
CREATE INDEX "AuditEvent_actorUserId_createdAt_idx" ON "AuditEvent"("actorUserId", "createdAt");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");
CREATE INDEX "AuditEvent_tenantId_createdAt_idx" ON "AuditEvent"("tenantId", "createdAt");

ALTER TABLE "CommissionPolicy" ADD CONSTRAINT "CommissionPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinancialTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "CommissionPolicy" ("id", "scopeKey", "storeCommissionBps", "marketplaceCommissionBps", "minimumMarketplaceFeeCents", "createdAt", "updatedAt")
VALUES ('global-default-commission-policy', 'GLOBAL', 800, 700, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("scopeKey") DO NOTHING;

INSERT INTO "SubscriptionPlan" ("id", "code", "name", "monthlyPriceCents", "currency", "featuresJson", "isActive", "createdAt", "updatedAt") VALUES
  ('subscription-plan-starter', 'STARTER', 'Starter', 9900, 'cad', '["storefront","quotes","basic_crm"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('subscription-plan-growth', 'GROWTH', 'Growth', 19900, 'cad', '["storefront","quotes","crm","dispatch","marketplace"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('subscription-plan-professional', 'PROFESSIONAL', 'Professional', 39900, 'cad', '["storefront","quotes","crm","dispatch","marketplace","advanced_reporting"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
