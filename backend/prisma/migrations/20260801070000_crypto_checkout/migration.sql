CREATE TYPE "CryptoInvoiceStatus" AS ENUM ('CREATED','AWAITING_PAYMENT','DETECTED','CONFIRMING','PAID','UNDERPAID','OVERPAID','EXPIRED','FAILED','REFUND_PENDING','REFUNDED');
CREATE TABLE "CryptoPaymentSettings" (
 "id" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"enabled" BOOLEAN NOT NULL DEFAULT false,"provider" TEXT NOT NULL DEFAULT 'MOCK',
 "acceptedAssets" JSONB NOT NULL,"requiredConfirmations" INTEGER NOT NULL DEFAULT 2,"invoiceExpiryMinutes" INTEGER NOT NULL DEFAULT 30,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "CryptoPaymentSettings_pkey" PRIMARY KEY("id")
);
CREATE TABLE "CryptoInvoice" (
 "id" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"orderId" TEXT NOT NULL,"provider" TEXT NOT NULL,"providerInvoiceId" TEXT NOT NULL,
 "asset" TEXT NOT NULL,"chain" TEXT NOT NULL,"fiatCurrency" TEXT NOT NULL,"fiatAmountCents" INTEGER NOT NULL,
 "cryptoAmount" DECIMAL(30,12) NOT NULL,"amountReceived" DECIMAL(30,12) NOT NULL DEFAULT 0,"exchangeRate" DECIMAL(30,12) NOT NULL,
 "paymentAddress" TEXT NOT NULL,"qrPayload" TEXT NOT NULL,"transactionHash" TEXT,"confirmations" INTEGER NOT NULL DEFAULT 0,
 "requiredConfirmations" INTEGER NOT NULL,"status" "CryptoInvoiceStatus" NOT NULL DEFAULT 'CREATED',"expiresAt" TIMESTAMP(3) NOT NULL,
 "paidAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CryptoInvoice_pkey" PRIMARY KEY("id")
);
CREATE TABLE "CryptoWebhookEvent" (
 "id" TEXT NOT NULL,"provider" TEXT NOT NULL,"providerEventId" TEXT NOT NULL,"invoiceId" TEXT NOT NULL,"payloadHash" TEXT NOT NULL,
 "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "CryptoWebhookEvent_pkey" PRIMARY KEY("id")
);
CREATE UNIQUE INDEX "CryptoPaymentSettings_tenantId_key" ON "CryptoPaymentSettings"("tenantId");
CREATE UNIQUE INDEX "CryptoInvoice_orderId_key" ON "CryptoInvoice"("orderId");
CREATE UNIQUE INDEX "CryptoInvoice_providerInvoiceId_key" ON "CryptoInvoice"("providerInvoiceId");
CREATE INDEX "CryptoInvoice_tenantId_status_idx" ON "CryptoInvoice"("tenantId","status");
CREATE INDEX "CryptoInvoice_expiresAt_status_idx" ON "CryptoInvoice"("expiresAt","status");
CREATE UNIQUE INDEX "CryptoWebhookEvent_provider_providerEventId_key" ON "CryptoWebhookEvent"("provider","providerEventId");
CREATE INDEX "CryptoWebhookEvent_invoiceId_idx" ON "CryptoWebhookEvent"("invoiceId");
ALTER TABLE "CryptoPaymentSettings" ADD CONSTRAINT "CryptoPaymentSettings_tenantId_fkey" FOREIGN KEY("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CryptoInvoice" ADD CONSTRAINT "CryptoInvoice_tenantId_fkey" FOREIGN KEY("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CryptoInvoice" ADD CONSTRAINT "CryptoInvoice_orderId_fkey" FOREIGN KEY("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CryptoWebhookEvent" ADD CONSTRAINT "CryptoWebhookEvent_invoiceId_fkey" FOREIGN KEY("invoiceId") REFERENCES "CryptoInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
