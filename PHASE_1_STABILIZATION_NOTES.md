# Phase 1 Stabilization Notes

This package applies the Phase 1 stabilization fixes without intentionally changing product scope or major architecture.

## Fixed

- Removed obsolete frontend `/tenant/public` dependency paths from active tenant-resolution flows.
- Fixed malformed API template strings that were being sent literally to the backend, including:
  - `/tenant/by-slug/${...}`
  - `/products${suffix}` style paths.
- Strengthened `frontend/lib/api.js` so all relative API paths normalize safely and include tenant headers.
- Strengthened `frontend/lib/tenant.js` so tenant slug resolution works from:
  - `/tenant/[slug]` paths
  - `tenant.loadlyx.com` subdomains
  - local development fallback.
- Cleaned `frontend/middleware.js` for wildcard tenant subdomain rewrites:
  - `cansask.loadlyx.com/` -> `/tenant/cansask`
  - `cansask.loadlyx.com/catalog` -> `/tenant/cansask/catalog`
  - `cansask.loadlyx.com/store` -> `/tenant/cansask/catalog`
- Updated `Header.jsx` so tenant subdomains show tenant navigation/branding instead of SaaS/global navigation.
- Fixed the custom tenant page fetch logic under `frontend/app/pages/[slug]/page.jsx`.
- Updated frontend product loading to use the centralized API helper.
- Updated tenant product detail fetches to send the tenant header instead of relying on query strings.
- Strengthened backend tenant/product lookup to accept tenant `slug` or `subdomain`.
- Updated checkout success/cancel URLs to use `FRONTEND_URL` in production, while preserving localhost fallback for local dev.

## Verified

- Frontend production build completes successfully with Next.js.
- Backend edited files pass Node syntax checks.

## Still Requires Production Data/Config

- Production products must exist in the Render database for featured products/catalog to show real items.
- Vercel must have:
  - `NEXT_PUBLIC_API_URL=https://loadlyx-backend.onrender.com/api`
  - `NEXT_PUBLIC_SITE_URL=https://www.loadlyx.com`
- Render backend must have:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `FRONTEND_URL=https://www.loadlyx.com`
  - Stripe variables as needed.
- DNS wildcard must remain configured for `*.loadlyx.com`.

## Recommended Test Order After Deploy

1. `https://www.loadlyx.com/tenant/demo`
2. `https://www.loadlyx.com/tenant/cansask`
3. `https://demo.loadlyx.com`
4. `https://cansask.loadlyx.com`
5. `https://cansask.loadlyx.com/catalog`
6. `https://cansask.loadlyx.com/store`
7. Open browser DevTools Network tab and verify API calls go to `https://loadlyx-backend.onrender.com/api` and include `x-tenant-slug`.
