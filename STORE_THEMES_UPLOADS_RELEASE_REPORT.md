# Loadlyx Store Themes and Product Uploads Report

## Decision

**Part 3 implemented — not yet a launch candidate.**

## Delivered

- Three approved built-in storefront themes with versioned, declarative manifests.
- Tenant theme listing, activation, customization boundary, and one-step rollback.
- Custom-theme submission with platform approval, disable, and deprecation states.
- Strict manifest allowlist; custom themes cannot execute scripts or server code.
- Theme activation and moderation audit events.
- Direct drag-and-drop and file-picker product photo uploads.
- JPEG, PNG, and WebP content-signature and size validation.
- Tenant-scoped media ownership, checksums, metadata, and safe generated keys.
- Multiple images, primary-image ordering, reordering, alternative text, and removal from a product draft.
- Tenant ownership checks when attaching uploaded assets to products.
- Public immutable asset delivery with authenticated, tenant-owned deletion.
- Storage-provider boundary with a working local adapter and explicit rejection of uninstalled production adapters.
- Existing URL images remain backward compatible but are no longer the primary product-admin workflow.

## Verification

- Backend test suite: 13 passed, 0 failed.
- Theme validation negative tests: passed.
- Image signature rejection test: passed.
- Safe tenant storage-path test: passed.
- Existing financial and tenant-slug regression tests: passed.
- Modified backend JavaScript syntax checks: passed.
- Prisma schema format and validation: passed with Prisma 5.22.0.

## Blockers and limitations

- The frontend production build remains unverified because the required native Next.js compiler is absent and the exact-package download timed out.
- The new migration must be applied to an isolated staging PostgreSQL database before production.
- The working media adapter stores files on persistent local backend storage. Vercel Blob, Cloudinary, S3, or Supabase needs a deployment adapter and credentials before using uploads on an ephemeral host.
- Automated browser upload and theme-preview checks require a running database-backed environment.

## New environment variables

- `MEDIA_STORAGE_PROVIDER=LOCAL`
- `MEDIA_STORAGE_PATH=<persistent absolute directory>`
- `MAX_IMAGE_UPLOAD_BYTES=8388608`
- `BACKEND_PUBLIC_URL=https://api.loadlyx.com`
- `JSON_BODY_LIMIT=12mb`

Do not commit secrets or deployment-specific `.env` files.

## Production checklist

- Install dependencies from the lockfiles.
- Generate Prisma Client and apply both pending migrations to staging.
- Run frontend production build.
- Configure a persistent media provider; do not use ephemeral Vercel filesystem storage.
- Test upload, storefront rendering, ordering, alternative text, deletion, and cross-tenant denial.
- Test theme activation, custom submission, approval, disable, and rollback.
- Confirm all theme actions create audit events.
- Confirm existing catalog, checkout, financial, authentication, and tenant routing flows remain operational.

## Suggested release metadata

- Branch: `release/loadlyx-store-themes-uploads`
- Commit: `Add secure storefront themes and tenant-scoped product image uploads`
- Tag after staging verification: `loadlyx-store-themes-uploads-rc1`
