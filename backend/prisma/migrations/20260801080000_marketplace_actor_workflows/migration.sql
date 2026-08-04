CREATE TYPE "MarketplaceLoadStatus" AS ENUM ('DRAFT','POSTED','BIDDING','AWARDED','FUNDED','PICKED_UP','IN_TRANSIT','DELIVERED','COMPLETED','CANCELED','DISPUTED');
CREATE TYPE "MarketplaceBidStatus" AS ENUM ('SUBMITTED','WITHDRAWN','ACCEPTED','REJECTED');
CREATE TABLE "MarketplaceLoad" (
 "id" TEXT NOT NULL,"posterId" TEXT NOT NULL,"brokerId" TEXT,"carrierId" TEXT,"postedForCustomer" BOOLEAN NOT NULL DEFAULT false,
 "customerName" TEXT,"customerEmail" TEXT,"title" TEXT NOT NULL,"description" TEXT NOT NULL,"originCity" TEXT NOT NULL,
 "originRegion" TEXT,"originCountry" TEXT NOT NULL,"destinationCity" TEXT NOT NULL,"destinationRegion" TEXT,"destinationCountry" TEXT NOT NULL,
 "pickupDate" TIMESTAMP(3) NOT NULL,"deliveryDate" TIMESTAMP(3),"equipmentType" TEXT,"weightKg" DECIMAL(12,2),"budgetCents" INTEGER,
 "awardedAmountCents" INTEGER,"status" "MarketplaceLoadStatus" NOT NULL DEFAULT 'DRAFT',"proofOfDeliveryUrl" TEXT,"deliveredAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "MarketplaceLoad_pkey" PRIMARY KEY("id")
);
CREATE TABLE "MarketplaceBid" (
 "id" TEXT NOT NULL,"loadId" TEXT NOT NULL,"bidderId" TEXT NOT NULL,"amountCents" INTEGER NOT NULL,"message" TEXT,"transitDays" INTEGER,
 "status" "MarketplaceBidStatus" NOT NULL DEFAULT 'SUBMITTED',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "MarketplaceBid_pkey" PRIMARY KEY("id"),CONSTRAINT "MarketplaceBid_amount_check" CHECK("amountCents">0)
);
CREATE TABLE "MarketplaceMessage" (
 "id" TEXT NOT NULL,"loadId" TEXT NOT NULL,"senderId" TEXT NOT NULL,"body" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "MarketplaceMessage_pkey" PRIMARY KEY("id")
);
CREATE INDEX "MarketplaceLoad_status_pickupDate_idx" ON "MarketplaceLoad"("status","pickupDate");
CREATE INDEX "MarketplaceLoad_posterId_status_idx" ON "MarketplaceLoad"("posterId","status");
CREATE INDEX "MarketplaceLoad_brokerId_status_idx" ON "MarketplaceLoad"("brokerId","status");
CREATE INDEX "MarketplaceLoad_carrierId_status_idx" ON "MarketplaceLoad"("carrierId","status");
CREATE UNIQUE INDEX "MarketplaceBid_loadId_bidderId_key" ON "MarketplaceBid"("loadId","bidderId");
CREATE INDEX "MarketplaceBid_bidderId_status_idx" ON "MarketplaceBid"("bidderId","status");
CREATE INDEX "MarketplaceMessage_loadId_createdAt_idx" ON "MarketplaceMessage"("loadId","createdAt");
CREATE INDEX "MarketplaceMessage_senderId_idx" ON "MarketplaceMessage"("senderId");
ALTER TABLE "MarketplaceLoad" ADD CONSTRAINT "MarketplaceLoad_posterId_fkey" FOREIGN KEY("posterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceLoad" ADD CONSTRAINT "MarketplaceLoad_brokerId_fkey" FOREIGN KEY("brokerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceLoad" ADD CONSTRAINT "MarketplaceLoad_carrierId_fkey" FOREIGN KEY("carrierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceBid" ADD CONSTRAINT "MarketplaceBid_loadId_fkey" FOREIGN KEY("loadId") REFERENCES "MarketplaceLoad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceBid" ADD CONSTRAINT "MarketplaceBid_bidderId_fkey" FOREIGN KEY("bidderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceMessage" ADD CONSTRAINT "MarketplaceMessage_loadId_fkey" FOREIGN KEY("loadId") REFERENCES "MarketplaceLoad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceMessage" ADD CONSTRAINT "MarketplaceMessage_senderId_fkey" FOREIGN KEY("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
