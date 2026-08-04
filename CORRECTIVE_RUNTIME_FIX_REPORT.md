# Loadlyx tenant, checkout, loadboard, and simulation corrective report

Date: 2026-08-04

## Corrected

- Removed the global tenant chooser from the Platform Owner / Super Admin shell.
- Preserved tenant-specific controls inside tenant management workflows.
- Verified the dedicated Loadlyx PostgreSQL database still contains active `demo` and `cansask` tenants.
- Verified `admin@loadlyx.com`, `demo@loadlyx.com`, and `saskmoves@gmail.com` match the requested local password.
- Corrected public store checkout so it no longer requires an admin/login token.
- Corrected the Stripe checkout confirmation route so it is not shadowed by the generic order route.
- Preserved the originating tenant domain through Stripe success and cancellation URLs.
- Added safe async checkout error handling so invalid input cannot crash the backend.
- Revalidated loadboard authentication against `/auth/me`; stale browser storage no longer exposes the posting form.
- Confirmed the backend rejects anonymous load posting with HTTP 401.
- Added the dedicated Loadlyx Load Board header and marketing presentation.
- Added `loads.loadlyx.com`, `loads.localhost`, and `loads.loadlyx.local` routing without resolving `loads` as a tenant.
- Reworked Super Admin simulation controls around simulated-load visibility, generation, intensity, region, and clearing.

## Fresh verification evidence

- Prisma Client generated successfully.
- Database migration status: 24 migrations, schema up to date.
- Frontend production build: passed, 57 routes.
- Backend syntax checks: passed.
- Backend automated tests: 48 passed, 0 failed.
- `GET /api/tenant/by-slug/demo`: 200.
- `GET /tenant/demo`: 200.
- `GET /api/tenant/by-slug/cansask`: 200.
- `GET /tenant/cansask`: 200.
- Demo login and `/auth/me`: passed as `TENANT_ADMIN` for tenant `demo`.
- Anonymous load post: rejected with HTTP 401.
- Super Admin simulation configuration endpoint: passed.
- `loads.localhost` rewrite: 200 with Loadlyx Load Board branding.
- Stripe test checkout: created a local test order and returned a valid `checkout.stripe.com` URL.

## Production setup still required

- Add `loads.loadlyx.com` as a production domain and DNS record pointing at the frontend deployment.
- Retain the configured Stripe webhook endpoint and test it from Stripe CLI or the Stripe dashboard before launch.
- Use test card `4242 4242 4242 4242` only after redirecting to Stripe-hosted test checkout.
