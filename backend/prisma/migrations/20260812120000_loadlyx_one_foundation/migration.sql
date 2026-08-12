ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DRIVER';

CREATE TYPE "TruckAvailabilityStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ASSIGNED', 'IN_TRANSIT', 'UNAVAILABLE');
CREATE TYPE "FreightAssignmentStatus" AS ENUM ('ASSIGNMENT_PENDING', 'DRIVER_ACCEPTED', 'DRIVER_DECLINED', 'EN_ROUTE_PICKUP', 'ARRIVED_PICKUP', 'LOADED', 'IN_TRANSIT', 'ARRIVED_DELIVERY', 'DELIVERED', 'POD_PENDING', 'COMPLETE');
CREATE TYPE "FreightDocumentCategory" AS ENUM ('BILL_OF_LADING', 'PROOF_OF_DELIVERY', 'RATE_CONFIRMATION', 'INVOICE', 'PHOTO', 'DAMAGE', 'INSURANCE', 'AUTHORITY', 'OTHER');
CREATE TYPE "FreightGeofenceEventType" AS ENUM ('APPROACHING_PICKUP', 'ARRIVED_PICKUP', 'DEPARTED_PICKUP', 'APPROACHING_DELIVERY', 'ARRIVED_DELIVERY');

ALTER TABLE "MarketplaceLoad" ADD COLUMN "instantBookEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "instantBookCents" INTEGER,
ADD COLUMN "instantBookRules" JSONB,
ADD COLUMN "fullOrPartial" TEXT NOT NULL DEFAULT 'FULL',
ADD COLUMN "trailerType" TEXT,
ADD COLUMN "distanceKm" DECIMAL(12,2),
ADD COLUMN "hazmat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "teamDriverRequired" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "FreightDriverProfile" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "carrierId" TEXT, "licenseRegion" TEXT,
  "licenseClass" TEXT, "phone" TEXT, "emergencyContactJson" JSONB, "trackingConsentAt" TIMESTAMP(3),
  "trackingRevokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "FreightDriverProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FreightDriverProfile_userId_key" ON "FreightDriverProfile"("userId");
CREATE INDEX "FreightDriverProfile_carrierId_idx" ON "FreightDriverProfile"("carrierId");

CREATE TABLE "TruckAvailability" (
  "id" TEXT NOT NULL, "carrierId" TEXT NOT NULL, "createdById" TEXT NOT NULL, "assignedDriverId" TEXT,
  "truckId" TEXT NOT NULL, "equipmentType" TEXT NOT NULL, "trailerType" TEXT, "capacityKg" DECIMAL(12,2),
  "currentCity" TEXT NOT NULL, "currentRegion" TEXT, "currentLatitude" DECIMAL(10,7), "currentLongitude" DECIMAL(10,7),
  "availableAt" TIMESTAMP(3) NOT NULL, "desiredDestination" TEXT, "maximumDeadheadKm" DECIMAL(12,2),
  "operatingRadiusKm" DECIMAL(12,2), "preferredLanesJson" JSONB, "homeTerminal" TEXT,
  "teamDriver" BOOLEAN NOT NULL DEFAULT false, "recurringLaneRule" JSONB, "specialCapabilities" JSONB,
  "status" "TruckAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "TruckAvailability_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TruckAvailability_carrierId_status_availableAt_idx" ON "TruckAvailability"("carrierId", "status", "availableAt");
CREATE INDEX "TruckAvailability_currentCity_status_idx" ON "TruckAvailability"("currentCity", "status");
CREATE INDEX "TruckAvailability_equipmentType_status_idx" ON "TruckAvailability"("equipmentType", "status");

CREATE TABLE "FreightAssignment" (
  "id" TEXT NOT NULL, "loadId" TEXT NOT NULL, "carrierId" TEXT NOT NULL, "truckId" TEXT, "driverId" TEXT,
  "assignedById" TEXT NOT NULL, "status" "FreightAssignmentStatus" NOT NULL DEFAULT 'ASSIGNMENT_PENDING',
  "acceptedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "FreightAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FreightAssignment_loadId_key" ON "FreightAssignment"("loadId");
CREATE INDEX "FreightAssignment_carrierId_status_idx" ON "FreightAssignment"("carrierId", "status");
CREATE INDEX "FreightAssignment_driverId_status_idx" ON "FreightAssignment"("driverId", "status");

CREATE TABLE "FreightStatusEvent" (
  "id" TEXT NOT NULL, "assignmentId" TEXT NOT NULL, "actorUserId" TEXT NOT NULL,
  "fromStatus" "FreightAssignmentStatus", "toStatus" "FreightAssignmentStatus" NOT NULL,
  "note" TEXT, "metadataJson" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FreightStatusEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FreightStatusEvent_assignmentId_createdAt_idx" ON "FreightStatusEvent"("assignmentId", "createdAt");

CREATE TABLE "FreightTrackingPoint" (
  "id" TEXT NOT NULL, "loadId" TEXT NOT NULL, "driverId" TEXT NOT NULL, "latitude" DECIMAL(10,7) NOT NULL,
  "longitude" DECIMAL(10,7) NOT NULL, "accuracyMeters" INTEGER, "speedKph" DECIMAL(8,2), "headingDegrees" INTEGER,
  "eta" TIMESTAMP(3), "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "retentionExpires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FreightTrackingPoint_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FreightTrackingPoint_loadId_capturedAt_idx" ON "FreightTrackingPoint"("loadId", "capturedAt");
CREATE INDEX "FreightTrackingPoint_driverId_capturedAt_idx" ON "FreightTrackingPoint"("driverId", "capturedAt");

CREATE TABLE "FreightGeofenceEvent" (
  "id" TEXT NOT NULL, "loadId" TEXT NOT NULL, "type" "FreightGeofenceEventType" NOT NULL,
  "suggestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "confirmedAt" TIMESTAMP(3), "metadataJson" JSONB,
  CONSTRAINT "FreightGeofenceEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FreightGeofenceEvent_loadId_suggestedAt_idx" ON "FreightGeofenceEvent"("loadId", "suggestedAt");

CREATE TABLE "FreightDocument" (
  "id" TEXT NOT NULL, "loadId" TEXT NOT NULL, "uploadedById" TEXT NOT NULL, "category" "FreightDocumentCategory" NOT NULL,
  "storageKey" TEXT NOT NULL, "privateUrl" TEXT NOT NULL, "fileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL, "checksum" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FreightDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FreightDocument_loadId_category_createdAt_idx" ON "FreightDocument"("loadId", "category", "createdAt");
CREATE INDEX "FreightDocument_uploadedById_createdAt_idx" ON "FreightDocument"("uploadedById", "createdAt");

CREATE TABLE "FreightSavedSearch" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" TEXT NOT NULL, "searchType" TEXT NOT NULL DEFAULT 'LOAD',
  "filtersJson" JSONB NOT NULL, "alertsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FreightSavedSearch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FreightSavedSearch_userId_name_searchType_key" ON "FreightSavedSearch"("userId", "name", "searchType");
CREATE INDEX "FreightSavedSearch_userId_alertsEnabled_idx" ON "FreightSavedSearch"("userId", "alertsEnabled");

ALTER TABLE "FreightDriverProfile" ADD CONSTRAINT "FreightDriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TruckAvailability" ADD CONSTRAINT "TruckAvailability_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TruckAvailability" ADD CONSTRAINT "TruckAvailability_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FreightAssignment" ADD CONSTRAINT "FreightAssignment_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "MarketplaceLoad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FreightAssignment" ADD CONSTRAINT "FreightAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FreightAssignment" ADD CONSTRAINT "FreightAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FreightStatusEvent" ADD CONSTRAINT "FreightStatusEvent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "FreightAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FreightStatusEvent" ADD CONSTRAINT "FreightStatusEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FreightTrackingPoint" ADD CONSTRAINT "FreightTrackingPoint_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "MarketplaceLoad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FreightTrackingPoint" ADD CONSTRAINT "FreightTrackingPoint_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FreightGeofenceEvent" ADD CONSTRAINT "FreightGeofenceEvent_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "MarketplaceLoad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FreightDocument" ADD CONSTRAINT "FreightDocument_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "MarketplaceLoad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FreightDocument" ADD CONSTRAINT "FreightDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FreightSavedSearch" ADD CONSTRAINT "FreightSavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
