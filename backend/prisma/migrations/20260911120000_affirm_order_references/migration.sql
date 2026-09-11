ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "affirmCheckoutToken" TEXT,
ADD COLUMN IF NOT EXISTS "affirmTransactionId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_affirmCheckoutToken_key" ON "Order"("affirmCheckoutToken");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_affirmTransactionId_key" ON "Order"("affirmTransactionId");

CREATE TABLE IF NOT EXISTS "StorefrontAnalyticsEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "sessionId" TEXT,
  "path" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StorefrontAnalyticsEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StorefrontAnalyticsEvent_tenantId_eventName_createdAt_idx" ON "StorefrontAnalyticsEvent"("tenantId", "eventName", "createdAt");
CREATE INDEX IF NOT EXISTS "StorefrontAnalyticsEvent_sessionId_createdAt_idx" ON "StorefrontAnalyticsEvent"("sessionId", "createdAt");
