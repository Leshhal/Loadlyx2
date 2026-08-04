-- Add explicit marketplace provider roles and prevent duplicate tenant subdomains.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'BROKER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CARRIER';

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_subdomain_key" ON "Tenant"("subdomain");
