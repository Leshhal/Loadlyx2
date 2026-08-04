CREATE TYPE "SimulationIntensity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TABLE "SimulationConfig" (
  "id" TEXT NOT NULL, "scopeKey" TEXT NOT NULL, "tenantId" TEXT, "enabled" BOOLEAN NOT NULL DEFAULT false,
  "intensity" "SimulationIntensity" NOT NULL DEFAULT 'LOW', "region" TEXT, "businessHours" JSONB,
  "watermark" TEXT NOT NULL DEFAULT 'DEMO DATA', "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SimulationConfig_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SimulationEvent" (
  "id" TEXT NOT NULL, "tenantId" TEXT, "runId" TEXT NOT NULL, "kind" TEXT NOT NULL, "payloadJson" JSONB NOT NULL,
  "isSimulated" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SimulationEvent_pkey" PRIMARY KEY ("id"), CONSTRAINT "SimulationEvent_simulated_check" CHECK ("isSimulated" = true)
);
CREATE UNIQUE INDEX "SimulationConfig_scopeKey_key" ON "SimulationConfig"("scopeKey");
CREATE UNIQUE INDEX "SimulationConfig_tenantId_key" ON "SimulationConfig"("tenantId");
CREATE INDEX "SimulationEvent_tenantId_createdAt_idx" ON "SimulationEvent"("tenantId", "createdAt");
CREATE INDEX "SimulationEvent_runId_idx" ON "SimulationEvent"("runId");
CREATE INDEX "SimulationEvent_kind_createdAt_idx" ON "SimulationEvent"("kind", "createdAt");
ALTER TABLE "SimulationConfig" ADD CONSTRAINT "SimulationConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationEvent" ADD CONSTRAINT "SimulationEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "SimulationConfig" ("id", "scopeKey", "enabled", "intensity", "watermark", "updatedAt") VALUES ('simulation_global', 'GLOBAL', false, 'LOW', 'DEMO DATA', CURRENT_TIMESTAMP) ON CONFLICT ("scopeKey") DO NOTHING;
