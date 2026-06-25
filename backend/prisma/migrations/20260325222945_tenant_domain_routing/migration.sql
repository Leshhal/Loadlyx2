-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "brandingJson" JSONB,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isMaster" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "primaryDomain" VARCHAR(255),
ADD COLUMN     "subdomain" VARCHAR(255),
ADD COLUMN     "subscriptionPlan" TEXT NOT NULL DEFAULT 'free';
