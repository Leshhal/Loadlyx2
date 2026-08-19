ALTER TABLE "Tenant" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Tenant" SET "isDemo" = true WHERE "slug" = 'demo';
