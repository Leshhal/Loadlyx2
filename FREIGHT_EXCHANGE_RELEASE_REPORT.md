# Freight Exchange standalone loadboard release

Date: 2026-08-04

## Outcome

- `loads.loadlyx.com` is treated as a platform host, never as a tenant slug.
- Public brand is **Freight Exchange**, with Loadlyx presented only as the powering platform.
- Public navigation has one account action: **Sign in**.
- Load posting and bidding require an authenticated role.
- Loadboard login and signup use distinct Freight Exchange pages.
- Loadboard signup always requests `MARKETPLACE_USER`; no tenant, broker, carrier, or admin role can be selected there.
- `/app/*` now performs a live backend session check before rendering.
- Marketplace-user navigation contains only loadboard-relevant features.
- CRM, dispatch, store administration, and financial-ledger tools are visibly locked for marketplace-only users.
- Marketplace customers retain store shopping access, as required by the marketplace account specification.

## Verification

- Frontend production build: passed, 59 routes.
- Frontend tests: 4 passed, 0 failed.
- Browser verification on `loads.localhost`: Freight Exchange branding, one Sign in action, isolated login, isolated signup, and unauthenticated dashboard redirect passed.
- ESLint was not configured in the repository; `next lint` opened its first-time interactive configuration prompt and was not used as pass evidence.

## Production configuration

- Point `loads.loadlyx.com` DNS and the frontend deployment domain to the same Next.js deployment.
- Keep `NEXT_PUBLIC_ROOT_DOMAIN=loadlyx.com`.
