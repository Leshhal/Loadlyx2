CREATE TABLE "FreightIntelligenceRecommendation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "userId" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "modelName" TEXT NOT NULL,
  "modelVersion" TEXT NOT NULL,
  "dataSource" TEXT NOT NULL,
  "inputSnapshot" JSONB NOT NULL,
  "recommendation" JSONB NOT NULL,
  "confidence" DECIMAL(5,2) NOT NULL,
  "explanation" JSONB NOT NULL,
  "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
  "userAction" TEXT,
  "actionedById" TEXT,
  "actionedAt" TIMESTAMP(3),
  "outcome" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FreightIntelligenceRecommendation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "FreightDataSource" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "provider" TEXT,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "licenseSummary" TEXT,
  "lastImportedAt" TIMESTAMP(3),
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FreightDataSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FreightDataSource_key_key" ON "FreightDataSource"("key");
CREATE INDEX "FreightIntelligenceRecommendation_tenantId_feature_createdAt_idx" ON "FreightIntelligenceRecommendation"("tenantId", "feature", "createdAt");
CREATE INDEX "FreightIntelligenceRecommendation_userId_createdAt_idx" ON "FreightIntelligenceRecommendation"("userId", "createdAt");
CREATE INDEX "FreightIntelligenceRecommendation_entityType_entityId_idx" ON "FreightIntelligenceRecommendation"("entityType", "entityId");
ALTER TABLE "FreightIntelligenceRecommendation" ADD CONSTRAINT "FreightIntelligenceRecommendation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FreightIntelligenceRecommendation" ADD CONSTRAINT "FreightIntelligenceRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
