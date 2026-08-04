# Loadlyx YXE Totes, Storefront, Shipping, Security, and Admin Release

## Final status

**NOT GIT READY — BLOCKED**

The source, schema, migrations, tenant provisioning, builds, and automated tests are verified. This release is not labeled Git-ready because live FedEx, UPS, and DHL credentials were unavailable; the carrier adapters therefore remain explicitly not externally verified. Interactive browser QA of every altered role and mobile layout also remains a release-owner task.

## Audit baseline

- Development source: the latest Loadlyx UI/backend source supplied in the active project.
- Repository metadata: the supplied source contains no `.git` directory, so branch and latest commit could not be confirmed.
- Existing data was preserved. No database reset, production-data deletion, or Docker-volume deletion was used.
- Existing authenticated marketplace load creation, tote assets, media uploads, tenant routing, order management, financial ledger, and admin foundations were retained.
- Reference review: `ferhatiltas/E-Commerce-App` is Flutter/Dart and MIT-licensed. Its catalog, categories, search, basket, product-detail, and mobile navigation concepts were used only as design guidance; no code was copied. The supplied `bilalesi/loadboard-1` URL was unavailable during review, so no code or license-dependent material was used from it.

## Implemented

### YXE Totes

- Idempotent tenant provisioning for `yxetotes` and its tenant administrator.
- Password is accepted only through `YXE_TOTES_TEMPORARY_PASSWORD`; it is not committed or logged.
- Three rental products with separate weekly rates, two-week minimums, minimum charges, tenant ownership, stable SKUs, service-area metadata, and inventory capacity.
- Saskatoon rental storefront content, how-it-works flow, delivery/pickup explanation, rental terms, FAQs, and tenant-editable branding data.
- Rental booking model and API with required move/delivery/pickup dates, pricing snapshot, contract snapshot, availability lookup, overlap detection, and inventory overbooking prevention.

### Can-Sask and catalog

- Production-safe moving-supply provisioner with 47 resulting Can-Sask products in the verified database.
- Existing matching product prices are preserved.
- Moving Boxes, Cargo Management, and Supplies categories support description, image/icon, order, enabled state, and tenant isolation.
- Bundle products retain editable structured metadata.

### Promotions and storefront

- Tenant-scoped product badge model with labels, type, percentage, active window, priority, tooltip, eligibility metadata, product/category assignment, and global templates.
- Product cards render a bounded number of active badges and rental-specific weekly/minimum pricing.
- Existing banner upload/storage and tenant branding paths were preserved; storefront hero images use responsive cover sizing and fallback layouts.

### Shipping

- Provider abstraction for FedEx, UPS, DHL, development mock, and manual flat rate.
- Tenant carrier configuration, sandbox/production mode, handling fees, markups, rate normalization, ten-minute caching, timeouts, quote expiration, dimensions/weight/postal validation, and immutable request/response snapshots.
- Tote rentals continue to use local delivery rules instead of parcel shipping.
- Live carrier status: **NOT EXTERNALLY VERIFIED**.

Required live variables include `FEDEX_CLIENT_ID`, `FEDEX_CLIENT_SECRET`, `UPS_CLIENT_ID`, `UPS_CLIENT_SECRET`, `DHL_API_KEY`, and `DHL_API_SECRET`. Provider-specific account and endpoint settings must be added according to each approved carrier account before production activation.

### Security map and controls

- Interactive OpenStreetMap/Leaflet map with pan, zoom, real map tiles, event markers, role/risk/result/tenant filters, device/session details, loading/empty/provider failure messaging, and privacy disclosure.
- Approximate edge geolocation only. It is not represented as an exact physical location.
- SUPER_ADMIN-only user, IP, session, and device block records with reasons, expiry, shared-IP warning acknowledgement, revocation, backend middleware enforcement, and audit events.
- Emergency SUPER_ADMIN accounts cannot be suspended through the user-block control.
- Connection retention remains configurable through `CONNECTION_RETENTION_DAYS`; detailed access is audited.

### Loadboard and plans

- Marketplace load creation remains protected by verified backend authentication and role checks; the authenticated owner is derived from the token, not browser-provided user IDs.
- Signed-out views conceal commercial amounts and route posting/bidding actions to the branded loadboard login.
- Plan editing no longer defaults to raw JSON. Pricing, public features, limits, feature entitlements, active state, and grandfathering are form controls with confirmation, reason, and audit recording.

## Migration

Migration: `20260804090000_yxe_totes_shipping_security`

It adds category presentation fields, rental pricing/capacity fields, product badges, rental bookings, shipping configuration/quotes, connection security metadata, and security blocks. It is additive and applied successfully to both the existing Loadlyx database and a newly created empty test database containing all 25 migrations.

## Verification evidence

- Prisma format: passed.
- Prisma validate: passed.
- Prisma generate: passed on the active Desktop source.
- Existing database migration: passed.
- Empty database migration chain: all 25 migrations passed.
- Provisioner first run: passed.
- Provisioner second run: passed with no duplicates.
- Verified database: YXE tenant present; TENANT_ADMIN account present; credential hash valid; 3 YXE rental products; 47 Can-Sask products.
- Backend automated tests: **53/53 passed**.
- Backend syntax production check: passed.
- Backend startup smoke: started successfully on the isolated smoke port.
- Frontend automated tests: **4/4 passed**.
- Frontend production build: passed, **60 routes**.
- Frontend build emitted non-fatal cache snapshot warnings caused by the linked local dependency directory and an expected build-time API connection refusal on a no-backend static-data attempt.
- `next lint` was not run because this Next.js 14 project has no non-interactive ESLint configuration; the production build's built-in lint/type phase passed.

## Manual release checklist

- Log in to YXE Totes and immediately replace the temporary password.
- Confirm `yxetotes.loadlyx.com` wildcard DNS and Vercel domain routing.
- Upload final YXE and demo tenant banner images and check focal cropping on phone and desktop.
- Book each tote package for two weeks and an additional week.
- Attempt an overlapping booking that exceeds tote capacity.
- Confirm Can-Sask product prices were not altered and edit placeholder prices before launch.
- Configure carrier sandbox credentials, request each live sandbox rate, and test timeouts/expired quotes.
- Review storefront badges and discount/free-shipping eligibility with real pricing rules.
- Test signed-out direct marketplace POST (expect 401), suspended account POST (expect denial), and cross-tenant product/category access.
- Test Super Admin security blocks from a disposable account/IP only; confirm emergency recovery remains available.
- Test light/dark themes and mobile layouts for YXE storefront, catalog, Loadboard, plans, security map, and security controls.
- Review browser console and backend logs with the complete local environment running.

## Rollback

- Application rollback: redeploy the prior verified source version.
- Data rollback: do not drop tables on a live database. Disable YXE Totes and newly provisioned products through administration, or use a reviewed tenant-scoped removal script after taking a database backup.
- Migration rollback should use a forward compensating migration, not manual destructive SQL.

## Recommended release metadata

- Branch: `feature/yxe-totes-storefront-security-sweep`
- Commit: `Add YXE Totes tenant, seed moving supplies, improve storefront and loadboard, secure load posting, and complete admin controls`
- Tag after external verification: `loadlyx-yxe-totes-rc1`
