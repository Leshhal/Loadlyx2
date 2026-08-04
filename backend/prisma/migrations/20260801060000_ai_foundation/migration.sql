CREATE TABLE "AiTenantConfig" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT false,
  "monthlyRequestLimit" INTEGER NOT NULL DEFAULT 100, "allowedModules" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiTenantConfig_pkey" PRIMARY KEY ("id"), CONSTRAINT "AiTenantConfig_limit_check" CHECK ("monthlyRequestLimit" BETWEEN 0 AND 100000)
);
CREATE TABLE "AiPromptTemplate" (
  "id" TEXT NOT NULL, "key" TEXT NOT NULL, "module" TEXT NOT NULL, "systemPrompt" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1, "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiPromptTemplate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AiUsageEvent" (
  "id" TEXT NOT NULL, "tenantId" TEXT, "userId" TEXT NOT NULL, "module" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL, "inputTokens" INTEGER NOT NULL DEFAULT 0, "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCostMicros" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL, "errorCode" TEXT,
  "requestHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AiTenantConfig_tenantId_key" ON "AiTenantConfig"("tenantId");
CREATE UNIQUE INDEX "AiPromptTemplate_key_key" ON "AiPromptTemplate"("key");
CREATE INDEX "AiUsageEvent_tenantId_createdAt_idx" ON "AiUsageEvent"("tenantId", "createdAt");
CREATE INDEX "AiUsageEvent_userId_createdAt_idx" ON "AiUsageEvent"("userId", "createdAt");
CREATE INDEX "AiUsageEvent_module_createdAt_idx" ON "AiUsageEvent"("module", "createdAt");
ALTER TABLE "AiTenantConfig" ADD CONSTRAINT "AiTenantConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "AiPromptTemplate" ("id", "key", "module", "systemPrompt", "version", "enabled", "updatedAt") VALUES
('ai_crm_assistant', 'crm-assistant', 'CRM', 'Assist with concise CRM summaries and drafts. Do not invent customer facts.', 1, true, CURRENT_TIMESTAMP),
('ai_marketplace_assistant', 'marketplace-assistant', 'MARKETPLACE', 'Assist with load descriptions, categories, and neutral provider comparisons. Do not guarantee price or availability.', 1, true, CURRENT_TIMESTAMP),
('ai_store_assistant', 'store-assistant', 'STORE', 'Assist with product copy, categorization, SEO text, and accessible alt text. Do not make unsupported claims.', 1, true, CURRENT_TIMESTAMP),
('ai_admin_assistant', 'admin-assistant', 'ADMIN', 'Summarize supplied platform metrics without exposing secrets or cross-tenant private data.', 1, true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
