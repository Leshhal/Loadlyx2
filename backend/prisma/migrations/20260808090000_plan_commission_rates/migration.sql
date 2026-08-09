-- Align auto-generated legacy tenant policies with the documented plan rates.
-- Policies already customized away from the old 8%/7% defaults are preserved.
ALTER TABLE "SubscriptionPlan"
  ADD COLUMN IF NOT EXISTS "storeCommissionBps" INTEGER NOT NULL DEFAULT 650,
  ADD COLUMN IF NOT EXISTS "marketplaceCommissionBps" INTEGER NOT NULL DEFAULT 650;

UPDATE "SubscriptionPlan"
SET
  "storeCommissionBps" = CASE "code"::text WHEN 'PROFESSIONAL' THEN 300 WHEN 'GROWTH' THEN 550 ELSE 650 END,
  "marketplaceCommissionBps" = CASE "code"::text WHEN 'PROFESSIONAL' THEN 300 WHEN 'GROWTH' THEN 550 ELSE 650 END;

ALTER TABLE "SubscriptionPlan"
  ADD CONSTRAINT "SubscriptionPlan_commission_rates_check"
  CHECK ("storeCommissionBps" BETWEEN 0 AND 10000 AND "marketplaceCommissionBps" BETWEEN 0 AND 10000);

DO $$ BEGIN
  ALTER TABLE "WithdrawalRequest"
    ADD CONSTRAINT "WithdrawalRequest_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OAuthState" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OAuthState_tokenHash_key" ON "OAuthState"("tokenHash");
CREATE INDEX IF NOT EXISTS "OAuthState_expiresAt_idx" ON "OAuthState"("expiresAt");

UPDATE "CommissionPolicy" AS policy
SET
  "storeCommissionBps" = CASE subscription."planCode"::text
    WHEN 'PROFESSIONAL' THEN 300
    WHEN 'GROWTH' THEN 550
    ELSE 650
  END,
  "marketplaceCommissionBps" = CASE subscription."planCode"::text
    WHEN 'PROFESSIONAL' THEN 300
    WHEN 'GROWTH' THEN 550
    ELSE 650
  END,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Subscription" AS subscription
WHERE policy."tenantId" = subscription."tenantId"
  AND policy."storeCommissionBps" = 800
  AND policy."marketplaceCommissionBps" = 700;
