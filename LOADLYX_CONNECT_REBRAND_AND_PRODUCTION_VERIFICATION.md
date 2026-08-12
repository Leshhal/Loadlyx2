# Loadlyx Connect rebrand and strict production-verification policy

## Rebrand status

Customer-facing source now presents **Loadlyx Connect** as the unified freight marketplace and execution environment for shippers, customers, brokers, carriers, drivers, SaaS tenants, freight opportunities, trucks, offers, tracking, documents, payments, settlement, and AI matching.

Preferred routes:

- UI: `/app/connect`
- API: `/api/loadlyx-connect`

Compatibility retained:

- `/app/one` remains a legacy UI alias.
- `/api/loadlyx-one` remains a legacy API alias.
- `loadlyxOne.js`, `loadlyxOneWorkflow.js`, old migration names, and historical reports remain internal/historical identifiers.

These identifiers were intentionally not renamed because existing bookmarks, clients, migration history, and deployed integrations may depend on them. They do not define current product presentation.

## Strict verification rules

No OAuth provider is considered verified because a button renders, a start route exists, or environment variables are present. Google, Apple, and Discord each require a complete deployed flow covering new account creation, safe matching-email linking, repeat provider login, cancellation, provider failure, missing/unverified email, role routing, refresh persistence, logout, and re-login.

Email verification is not live verified until a new production registration delivers a branded message to a real inbox, its live-domain link verifies the account, and the user can log in, refresh, log out, and log in again.

Forgot password is not live verified until a real production email arrives, the link changes the password, the token cannot be reused, the new password works, and the old password fails.

Production role routing and logout require checks against the deployed Vercel frontend, Render backend, and Render PostgreSQL database.

## Current status

| Gate | Status |
|---|---|
| Loadlyx Connect rebrand in source | PASS after source/build verification; production deployment scan not run |
| Google OAuth | CONFIGURED — EXTERNAL CREDENTIALS REQUIRED or live-flow verification required |
| Apple OAuth | CONFIGURED — EXTERNAL CREDENTIALS REQUIRED or live-flow verification required |
| Discord OAuth | CONFIGURED — EXTERNAL CREDENTIALS REQUIRED or live-flow verification required |
| Email Verification | FAILED — no live delivery flow executed in this release |
| Forgot Password | FAILED — no live delivery flow executed in this release |
| Production Role Routing | FAIL — not executed in this release |
| Production Logout | FAIL — not executed in this release |

Provider-specific `CONFIGURED` classification must be refreshed from the deployed environment before release. If credentials exist but callbacks are incomplete, use `CONFIGURED — CALLBACK CONFIGURATION REQUIRED`. If an attempted live flow errors, use `FAILED — AUTH FLOW ERROR`. Only a complete successful live flow permits `VERIFIED — LIVE FLOW PASSED`.

## Required deployed-account matrix

The following accounts must be checked in Render PostgreSQL and exercised through the Vercel application without exposing passwords:

- `admin@loadlyx.com`
- `demo@loadlyx.com`
- `saskmoves@gmail.com`
- `broker@loadlyx.com`
- `carrier@loadlyx.com`

For each: database record, role, tenant association, marketplace role, login, repeat login, logout, and correct dashboard.

## Release label prohibition

Do not publish `CUSTOMER-READY BUILD VERIFIED — VERCEL & RENDER DEPLOYED` until all live verification gates above pass and a deployed public scan finds no unintended “Loadlyx One” presentation.
