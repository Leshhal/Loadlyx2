# Reference Repository Review

Status: source-corrective package, **not a launch candidate**.

## Repositories reviewed

- Vercel Platforms: https://github.com/vercel/platforms
- Auth.js: https://github.com/nextauthjs/next-auth
- Better Auth: https://github.com/better-auth/better-auth
- Medusa: https://github.com/medusajs/medusa
- Saleor: https://github.com/saleor/saleor
- Refine: https://github.com/refinedev/refine
- OpenAI Node: https://github.com/openai/openai-node
- WalletConnect: https://github.com/WalletConnect/walletconnect-monorepo
- FullCalendar: https://github.com/fullcalendar/fullcalendar
- Meilisearch JS: https://github.com/meilisearch/meilisearch-js

These repositories were used as architectural references only. No repository was copied into Loadlyx and no wholesale framework migration was performed.

## Evidence-backed rework completed

### Tenant routing

Loadlyx previously recognized only `*.loadlyx.com` and `*.loadlyx.local`. The resolver is now isolated and tested, supports a configurable root domain, `tenant.localhost`, and explicit `tenant---deployment.vercel.app` preview labels. Reserved, nested, and malformed tenant hosts fail closed.

### Authentication sessions

Loadlyx created rotating refresh tokens but returned and stored them in browser local storage, and the frontend did not automatically use the refresh endpoint. Refresh tokens are now delivered in an HTTP-only, scoped cookie. Login, refresh, and logout set, rotate, revoke, or clear that cookie. API and admin requests include credentials, refresh once after a 401, retry the original request, and clear the client session when refresh fails. A request-body refresh token remains temporarily accepted for backward compatibility.

This improves the existing custom authentication system but does not claim parity with Auth.js or Better Auth. Access tokens remain browser-managed, OAuth callbacks remain incomplete, and a future dedicated authentication migration should be a separate release.

### AI provider compatibility

The compatible HTTP adapter previously looked for `output_text`, which is an SDK convenience, or a Chat Completions `choices` response. It now also extracts text from the official Responses API `output[].content[]` structure and captures a provider request identifier when available.

## Reviewed without source replacement

- Medusa and Saleor reinforce modular commerce, provider-neutral payments, workflows, and idempotent event handling. Loadlyx already has separated settlement calculations, immutable ledger entries, payment adapters, and idempotency keys. Replacing this with either commerce platform would be a major product migration, not a corrective patch.
- Refine provides a strong headless CRUD/admin model. Loadlyx's current admin is custom and tightly coupled to its permissions and routes; adopting Refine should be evaluated as a dedicated admin rewrite rather than mixed into this correction.
- WalletConnect establishes wallet sessions and signing. It does not by itself verify settlement or replace the crypto invoice/provider/webhook architecture. The current crypto integration remains MOCK-only and is not production verified.
- FullCalendar is relevant to the future dispatch/scheduling release. No scheduling implementation was changed in this correction.
- Meilisearch JS is relevant to future catalog, load-board, and admin search. No search service was added because indexing, tenancy filters, and deployment configuration require a separate bounded release.

## Fresh verification

- Backend automated tests: 40 passed, 0 failed.
- Frontend tenant-host tests: 3 passed, 0 failed.
- Backend JavaScript syntax: passed.
- Frontend JavaScript/JSX parse check: 80 files passed.
- Prisma validation: not freshly completed because the exact native engine download timed out.
- Frontend production build: not completed because the Windows native SWC binary remained locked after the dependency install timed out.
- Database migrations, OAuth providers, email delivery, live AI provider, real crypto provider, Stripe reconciliation, wildcard DNS, and Vercel deployment were not externally verified.

## Remaining high-priority launch blockers

1. Complete OAuth provider callbacks and end-to-end authentication testing.
2. Decide whether to finish hardening the custom auth system or migrate deliberately to Better Auth/Auth.js; do not run two authorities in parallel.
3. Run Prisma validation and all migrations against an isolated database and a production snapshot rehearsal.
4. Complete a clean locked dependency install and successful Next.js production build in CI or a clean Windows environment.
5. Replace MOCK crypto with a real provider and verify raw webhook signatures, confirmations, refund, expiration, and reconciliation flows.
6. Record actual Stripe processing fees from balance transactions instead of leaving the settlement processor fee at zero.
7. Configure wildcard DNS/Vercel domains and verify root, `www`, tenant, unknown-tenant, suspended-tenant, and preview behavior.

## New configuration

- Frontend: `NEXT_PUBLIC_ROOT_DOMAIN=loadlyx.com`
- Backend: `AUTH_COOKIE_SAME_SITE` and optional `AUTH_COOKIE_DOMAIN`

For production, keep the API on a trusted Loadlyx domain such as `api.loadlyx.com`. Cross-site browser cookie restrictions can otherwise prevent reliable session restoration.
