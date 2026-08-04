CREATE TYPE "ReviewTargetType" AS ENUM ('USER', 'TENANT', 'STORE', 'PRODUCT');
CREATE TYPE "ReviewTransactionType" AS ENUM ('STORE_ORDER', 'MARKETPLACE_LOAD');
CREATE TYPE "ReviewModerationStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'LOCKED', 'REMOVED');
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED');

CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "reviewerId" TEXT NOT NULL,
  "revieweeUserId" TEXT,
  "targetType" "ReviewTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "transactionType" "ReviewTransactionType" NOT NULL,
  "transactionId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "body" TEXT NOT NULL,
  "photoUrls" JSONB,
  "verifiedTransaction" BOOLEAN NOT NULL DEFAULT false,
  "moderationStatus" "ReviewModerationStatus" NOT NULL DEFAULT 'PUBLISHED',
  "businessResponse" TEXT,
  "responseAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

CREATE TABLE "ReviewHelpfulVote" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewHelpfulVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReviewReport" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Dispute" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "openedByUserId" TEXT NOT NULL,
  "againstUserId" TEXT,
  "transactionType" "ReviewTransactionType" NOT NULL,
  "transactionId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "resolution" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Review_reviewerId_transactionType_transactionId_targetType_targetId_key" ON "Review"("reviewerId", "transactionType", "transactionId", "targetType", "targetId");
CREATE INDEX "Review_targetType_targetId_moderationStatus_idx" ON "Review"("targetType", "targetId", "moderationStatus");
CREATE INDEX "Review_revieweeUserId_moderationStatus_idx" ON "Review"("revieweeUserId", "moderationStatus");
CREATE INDEX "Review_tenantId_moderationStatus_idx" ON "Review"("tenantId", "moderationStatus");
CREATE UNIQUE INDEX "ReviewHelpfulVote_reviewId_userId_key" ON "ReviewHelpfulVote"("reviewId", "userId");
CREATE INDEX "ReviewHelpfulVote_userId_idx" ON "ReviewHelpfulVote"("userId");
CREATE UNIQUE INDEX "ReviewReport_reviewId_reporterId_key" ON "ReviewReport"("reviewId", "reporterId");
CREATE INDEX "ReviewReport_status_createdAt_idx" ON "ReviewReport"("status", "createdAt");
CREATE UNIQUE INDEX "Dispute_openedByUserId_transactionType_transactionId_key" ON "Dispute"("openedByUserId", "transactionType", "transactionId");
CREATE INDEX "Dispute_tenantId_status_idx" ON "Dispute"("tenantId", "status");
CREATE INDEX "Dispute_status_createdAt_idx" ON "Dispute"("status", "createdAt");

ALTER TABLE "Review" ADD CONSTRAINT "Review_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_revieweeUserId_fkey" FOREIGN KEY ("revieweeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReviewHelpfulVote" ADD CONSTRAINT "ReviewHelpfulVote_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewHelpfulVote" ADD CONSTRAINT "ReviewHelpfulVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_againstUserId_fkey" FOREIGN KEY ("againstUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
