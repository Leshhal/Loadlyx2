# Loadlyx Ratings, Reviews, and Disputes Report

## Decision

**Part 4 implemented — not yet a launch candidate.**

## Delivered

- Transaction-linked ratings for users, tenants, stores, and products.
- Verified-review eligibility for paid/fulfilled store orders and completed marketplace loads.
- One review per reviewer, transaction, and target.
- Two-way participant architecture using reviewer and optional reviewee identities.
- Written reviews, titles, up to six photo URLs, helpful votes, reports, and business responses.
- Rating average and star distribution excluding hidden, locked, and removed reviews.
- Platform moderation states: publish, hide, lock, and remove.
- Dispute opening restricted to transaction participants.
- Dispute review, resolution, rejection, and closure lifecycle.
- Super Admin review/dispute console.
- Audit events for moderation and dispute decisions.

## Verification

- Backend tests: 17 passed, 0 failed.
- Unrelated-user review denial: passed.
- Completed marketplace participant eligibility: passed.
- Moderated-review exclusion: passed.
- Backend syntax checks: passed.
- Prisma format and schema validation: passed.

## Remaining verification

- Apply migration to staging PostgreSQL.
- Run browser workflows with seeded customers, brokers, carriers, tenants, orders, and completed loads.
- Run the production frontend build after the exact native Next.js compiler becomes available.
- Confirm review photos use the persistent production media adapter.

## Suggested release metadata

- Branch: `release/loadlyx-reputation-disputes`
- Commit: `Add verified marketplace reviews, moderation, and transaction disputes`
- Tag after staging verification: `loadlyx-reputation-disputes-rc1`
