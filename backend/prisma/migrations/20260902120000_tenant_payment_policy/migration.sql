CREATE TYPE "StripeTenantPolicy" AS ENUM ('PLATFORM_STRIPE_ALLOWED', 'OWN_STRIPE', 'STRIPE_CONNECT', 'DISABLED');

ALTER TABLE "Tenant"
ADD COLUMN "stripePolicy" "StripeTenantPolicy" NOT NULL DEFAULT 'DISABLED',
ADD COLUMN "stripeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "paypalEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Tenant"
SET "stripePolicy" = 'PLATFORM_STRIPE_ALLOWED', "stripeEnabled" = true
WHERE "isMaster" = true OR "slug" = 'cansask';
