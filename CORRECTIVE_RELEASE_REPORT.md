# Loadlyx Corrective Release Report

> Historical report for the preceding authentication and tenant-routing milestone. For the current financial milestone, see `FINANCIAL_FOUNDATION_RELEASE_REPORT.md`.

## Status

**Not a launch candidate — blocked**

This package contains a focused correction to the Phase 2 authentication and tenant-routing foundation. It must not be described as the complete foundation release requested in the supplied specification.

## Implemented in this package

- Tenant-owner signup atomically creates the tenant, unique slug/subdomain, owner relationship, starter plan, and default storefront branding.
- Tenant slugs are normalized and checked for length and reserved names.
- Duplicate subdomains are prevented at both the API and database levels.
- Broker and carrier are explicit account roles.
- Signup requires full name, password confirmation in the UI, and terms acceptance.
- Unverified accounts cannot sign in.
- Password-reset and verification tokens are no longer returned in API responses or rendered by the signup page.
- Authentication email delivery uses a provider-neutral webhook boundary; development can log action URLs without exposing them to the browser.
- Verification email resend is available with a non-enumerating response.
- Sensitive authentication routes receive a stricter rate limit.
- Root-domain API responses no longer dereference a missing tenant.
- Suspended tenants return a distinct response.
- Production and local subdomain reserved-name handling is aligned.
- Missing environment templates were restored without secrets.

## Mandatory scope not implemented

The source baseline does not contain production implementations for the following requested systems, and they were not fabricated as superficial scaffolds in this corrective slice:

- Complete OAuth callback/token exchange for Google, Apple, and Discord
- Production email-provider integration and delivery verification
- Three-tier subscription lifecycle and billing portal
- Immutable general ledger and marketplace/broker/carrier deal settlement
- Store and marketplace commission administration
- Ratings, reviews, and moderation
- Marketplace simulation/demo engine
- Central AI provider, usage, quota, and cost controls
- Admin portal replacement and operations map
- Provider-backed direct product image uploads
- Safe installable storefront theme packages
- Crypto invoices, confirmation tracking, reconciliation, and refunds

## Verification performed

- `node --check` passed for the changed backend modules.
- `node --check` passed for the frontend middleware and shared libraries.
- `node --test` passed all tenant-slug unit tests (3/3).

## Verification blocked

- Prisma validation/generation: the uploaded ZIP omitted Prisma's required `prisma_schema_build_bg.wasm`; clean package installation timed out.
- Next.js production build: the uploaded ZIP omitted the native SWC binary; Next attempted to download it but the environment could not complete the download.
- Database migrations: no isolated PostgreSQL test database was supplied.
- Runtime authentication email, OAuth, wildcard DNS, Vercel preview, and production checks require external configuration and credentials.

## Production migration plan

1. Back up the production database.
2. Check for duplicate non-null `Tenant.subdomain` values and normalize or resolve them before applying the unique index.
3. Install dependencies from the committed lockfiles on a supported Node LTS release.
4. Run `npx prisma validate` and `npx prisma generate`.
5. Apply migrations first to a production-like staging database.
6. Verify existing users and tenants, then exercise tenant-owner signup and rollback from a database snapshot.
7. Apply to production during a controlled release window.

## Deployment configuration

Frontend:

- `NEXT_PUBLIC_API_URL=https://<backend-host>/api`
- `NEXT_PUBLIC_SITE_URL=https://loadlyx.com`

Backend:

- Copy documented keys from `backend/.env.example` into the hosting provider; never commit the real values.
- Use a long random `JWT_SECRET`.
- Set `FRONTEND_URL=https://loadlyx.com`.
- Add preview origins explicitly through `ALLOWED_ORIGINS`.
- Configure `EMAIL_WEBHOOK_URL` and its secret before production signup/reset testing.

Tenant domains:

- Add `loadlyx.com`, `www.loadlyx.com`, and `*.loadlyx.com` to the frontend deployment.
- Create the wildcard DNS record required by the deployment provider.
- Test root, `www`, a valid tenant, an unknown tenant, a reserved tenant name, and a suspended tenant.
- Local subdomain testing uses `<tenant>.loadlyx.local`; map that hostname to `127.0.0.1` locally.

## Manual authentication checklist

- Create marketplace, broker, carrier, and SaaS tenant-owner accounts.
- Confirm duplicate emails and duplicate/reserved slugs are rejected.
- Confirm the tenant owner provisions `tenantname.loadlyx.com` data.
- Confirm unverified login is rejected and resend verification is non-enumerating.
- Verify the email, sign in, refresh the session, close/reopen the browser, then log out.
- Request a reset for existing and unknown emails and compare their public responses.
- Reset the password; confirm old refresh tokens no longer work.
- Confirm marketplace users cannot access tenant or platform administration APIs.
- Confirm tenant users cannot cross tenant boundaries.
- Confirm Support, Admin, Platform Admin, and Super Admin privileges remain distinct.

## Source control recommendation

- Branch: `release/loadlyx-auth-tenant-corrective`
- Commit: `Harden authentication and provision tenant subdomains safely`
- Tag only after blocked checks pass: `loadlyx-auth-tenant-rc1`

## Rollback

Revert the application commit and restore the pre-migration database snapshot. If the migration was applied but no new `BROKER` or `CARRIER` records were created, the unique subdomain index can be dropped as a targeted rollback; PostgreSQL enum values should be left in place unless a fully rehearsed enum rebuild is available.
