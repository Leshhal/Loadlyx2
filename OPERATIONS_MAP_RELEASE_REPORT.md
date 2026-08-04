# Loadlyx Operations Map Report

## Decision

**Operations-map milestone implemented — not yet a launch candidate.**

## Delivered

- Authenticated session heartbeat and active-session window.
- Edge-header city, region, country, and rounded-coordinate collection.
- HMAC connection fingerprints; raw IP addresses are never stored.
- Approximate world map, user detail panel, connected-user table, tenants, and active load routes.
- Platform-role access, elevated detailed access, and access auditing.
- Configurable 30-day default retention with audited cleanup.
- Clear separation of connection-derived locations from business/load locations.

## Verification

- Backend tests: 20 passed, 0 failed.
- Hash privacy, coordinate rounding, bounds, syntax, and Prisma validation: passed.

## Remaining verification

- Apply migration and test with Vercel/Cloudflare location headers in staging.
- Confirm applicable privacy notices, consent, and retention policy with legal counsel.
- Run frontend production build and browser accessibility checks.

## Suggested release metadata

- Branch: `release/loadlyx-operations-map`
- Commit: `Add privacy-controlled live platform operations map`
- Tag after staging verification: `loadlyx-operations-map-rc1`
