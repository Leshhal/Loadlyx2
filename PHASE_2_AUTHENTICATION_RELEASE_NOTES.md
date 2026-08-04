# Loadlyx Phase 2 — Authentication Release Notes

## Scope completed
- Added hardened backend authentication routes:
  - `POST /api/auth/signup`
  - `POST /api/auth/register` compatibility alias
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
  - `POST /api/auth/verify-email`
  - `GET /api/auth/oauth/:provider/start` for Google, Apple, and Discord configuration readiness
- Added Prisma models for auth tokens and OAuth account mapping.
- Expanded RBAC roles for SaaS/platform/marketplace separation.
- Made marketplace users possible without tenant SaaS access.
- Added refresh-token rotation and password-reset invalidation of active refresh tokens.
- Removed sensitive JWT debug logging.
- Added frontend pages for login, signup, forgot password, reset password, and email verification.
- Added an admin route guard wrapper for `/admin/*` pages.
- Added frontend auth/session helper utilities.

## Changed files
- `backend/prisma/schema.prisma`
- `backend/.env.example`
- `backend/src/lib/auth.js`
- `backend/src/routes/auth.js`
- `backend/src/middleware/requireauth.js`
- `frontend/lib/auth.js`
- `frontend/lib/adminFetch.js` indirectly remains compatible with stored token
- `frontend/components/AdminGuard.jsx`
- `frontend/app/admin/layout.jsx`
- `frontend/app/login/page.js`
- `frontend/app/signup/page.jsx`
- `frontend/app/forgot-password/page.jsx`
- `frontend/app/reset-password/page.jsx`
- `frontend/app/verify-email/page.jsx`

## Verification performed
- `npm --prefix frontend install --ignore-scripts` completed.
- `npm --prefix backend install --ignore-scripts` completed.
- `npm --prefix frontend run build` completed successfully.
- Backend JavaScript syntax check completed successfully with `node --check` across `backend/src/**/*.js`.

## Verification limitation
- `prisma generate` could not complete in this sandbox because Prisma attempted to download its query engine from `binaries.prisma.sh`, and outbound network/DNS access failed with `getaddrinfo EAI_AGAIN binaries.prisma.sh`.
- The schema changes are present, but `npx prisma generate` should be rerun in the normal development environment after dependencies are installed with network access.

## Manual test checklist
1. Copy `backend/.env.example` to `backend/.env` and set a strong `JWT_SECRET`.
2. Run `npm --prefix backend install`.
3. Run `npm --prefix frontend install`.
4. Run `npx --prefix backend prisma generate --schema backend/prisma/schema.prisma`.
5. Apply the database schema update with Prisma migration or db push.
6. Seed the demo tenant.
7. Start backend and frontend.
8. Visit `/signup` and create a marketplace user.
9. Visit `/signup` and create a tenant admin using tenant slug `demo`.
10. Use the returned development verification token on `/verify-email`.
11. Login at `/login` and confirm redirect to `/admin/dashboard` for tenant admin users.
12. Confirm `/admin/dashboard` redirects to `/login` when local session storage is cleared.
13. Use `/forgot-password`, copy the development reset token, and reset password at `/reset-password`.
14. Login with the new password.
15. Call `/api/auth/refresh` with the refresh token and confirm a new access token + refresh token are returned.
16. Test `/api/auth/oauth/google/start`, `/api/auth/oauth/apple/start`, and `/api/auth/oauth/discord/start`; they should report missing provider environment variables until credentials are set.

## Git commit message recommendation
`feat(auth): add phase 2 authentication flows and RBAC foundation`
