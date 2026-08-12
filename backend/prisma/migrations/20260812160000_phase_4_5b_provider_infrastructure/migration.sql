ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paypalOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paypalCaptureId" TEXT;
ALTER TABLE "OAuthState" ADD COLUMN IF NOT EXISTS "nonce" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_paypalOrderId_key" ON "Order"("paypalOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_paypalCaptureId_key" ON "Order"("paypalCaptureId");

CREATE TABLE IF NOT EXISTS "PaypalWebhookEvent" (
  "id" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "orderId" TEXT,
  "payloadHash" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaypalWebhookEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaypalWebhookEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PaypalWebhookEvent_providerEventId_key" ON "PaypalWebhookEvent"("providerEventId");
CREATE INDEX IF NOT EXISTS "PaypalWebhookEvent_orderId_idx" ON "PaypalWebhookEvent"("orderId");
CREATE INDEX IF NOT EXISTS "PaypalWebhookEvent_eventType_processedAt_idx" ON "PaypalWebhookEvent"("eventType", "processedAt");
