CREATE TABLE "ConnectionEvent" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tenantId" TEXT, "sessionHash" TEXT NOT NULL, "ipHash" TEXT NOT NULL,
  "city" TEXT, "region" TEXT, "country" TEXT, "latitude" DECIMAL(7,2), "longitude" DECIMAL(8,2),
  "source" TEXT NOT NULL DEFAULT 'EDGE_HEADERS', "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConnectionEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConnectionEvent_latitude_check" CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
  CONSTRAINT "ConnectionEvent_longitude_check" CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180)
);
CREATE UNIQUE INDEX "ConnectionEvent_userId_sessionHash_key" ON "ConnectionEvent"("userId", "sessionHash");
CREATE INDEX "ConnectionEvent_lastSeenAt_idx" ON "ConnectionEvent"("lastSeenAt");
CREATE INDEX "ConnectionEvent_tenantId_lastSeenAt_idx" ON "ConnectionEvent"("tenantId", "lastSeenAt");
CREATE INDEX "ConnectionEvent_country_region_city_idx" ON "ConnectionEvent"("country", "region", "city");
ALTER TABLE "ConnectionEvent" ADD CONSTRAINT "ConnectionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConnectionEvent" ADD CONSTRAINT "ConnectionEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
