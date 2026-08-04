# Loadlyx Marketplace Actor Workflows Report

## Decision

**Actor workflow foundation implemented — not yet a launch candidate.**

## Delivered

- General customers post and manage their own loads and cannot bid.
- Brokers post for customers, submit managed offers, award bids, and assign carriers.
- Carriers browse open loads, bid, and control pickup, transit, and delivery updates.
- Ordered load lifecycle from posting through completion/dispute.
- Proof of delivery required before delivered status.
- Participant-only load messaging.
- Marketplace UI for posting, browsing, bidding, and personal activity.
- Completed marketplace transactions connect to verified reviews.

## Verification

- Backend tests: 37 passed, 0 failed.
- Role separation, conversation isolation, and lifecycle transition tests: passed.
- Prisma schema and backend syntax checks: passed.

## Remaining external verification

- Database-backed browser flows for every actor.
- Carrier compliance approval must be connected to bid eligibility before public launch.
- Marketplace funding/payout provider integration and dispute holds need staging tests.
- Frontend production build remains blocked by the unavailable native Next.js compiler.

## Suggested release metadata

- Branch: `release/loadlyx-marketplace-actors`
- Commit: `Define customer, broker, and carrier marketplace workflows`
- Tag after staging verification: `loadlyx-marketplace-actors-rc1`
