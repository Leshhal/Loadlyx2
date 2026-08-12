# Loadlyx One — Phase 1 Freight Marketplace and Driver/Carrier OS

Status: **SOURCE CANDIDATE — NOT DEPLOYED**

The user explicitly required no deployment. Prompt 2 was not started because the supplied specification requires Prompt 1 to be stable first.

## Architecture

Loadlyx One extends the existing marketplace rather than replacing it:

- Existing `MarketplaceLoad`, offers, transactions, payouts, reviews, notifications, simulation, and trust services remain authoritative.
- New `/api/loadlyx-one` routes add capacity, role workspaces, saved searches, instant booking, assignments, tracking, geofence suggestions, and documents.
- `/app/one` is one role-sensitive web application that can operate as a PWA and later share APIs with Expo/React Native.
- Public tracking is rounded to approximate coordinates. Exact points remain participant-only and expire after the configured retention period.
- Geofences only suggest an event; they do not silently complete a material status transition.

## Database changes

Additive migration: `backend/prisma/migrations/20260812120000_loadlyx_one_foundation/migration.sql`

- Adds `DRIVER` to `UserRole`.
- Extends marketplace loads with instant book, trailer, distance, full/partial, hazmat, and team-driver requirements.
- Adds driver profiles, truck availability, assignments, immutable status events, tracking points, geofence events, freight documents, and saved searches.
- Existing tables and data are preserved; no destructive SQL is included.

## API changes

Base: `/api/loadlyx-one`

- `GET /workspace`
- `GET /loads/search`
- `POST /saved-searches`
- `GET|POST /trucks`
- `PUT|DELETE /trucks/:id`
- `POST /trucks/:id/clone`
- `POST /loads/:id/instant-book`
- `POST /loads/:id/assignment`
- `PUT /assignments/:id/status`
- `PUT /driver/tracking-consent`
- `POST|GET /loads/:id/tracking`
- `POST /loads/:id/geofences`
- `GET|POST /loads/:id/documents`

Existing `/api/marketplace/loads` accepts and filters the new freight fields.

## Role matrix

| Capability | Customer | Broker | Carrier | Driver | SaaS tenant | Platform admin |
|---|---:|---:|---:|---:|---:|---:|
| Post own load | Yes | Yes | No | No | Plan/permission | Yes |
| Post for customer | No | Yes | No | No | Broker permission | Yes |
| Search loads | Yes | Yes | Yes | Assigned view | Yes | Yes |
| Search trucks | No | Yes | No | No | Authorized staff | Yes |
| Post capacity | No | No | Yes | Authorized | Authorized staff | Read/support |
| Offer/counter | No | Yes | Yes | No | Role permission | Oversight |
| Assign driver | No | No | Winning carrier | No | Carrier permission | Yes |
| Execute milestones | No | No | Oversight | Assigned driver | Carrier permission | Oversight |
| View tracking | Participant | Participant | Participant | Assigned driver | Participant | Authorized |
| Upload documents | Participant | Participant | Participant | Assigned driver | Participant | Authorized |

Backend checks enforce these boundaries; navigation is not the security boundary.

## Driver workflow

```text
Assignment pending
  -> Driver accepted (or declined)
  -> En route pickup
  -> Arrived pickup
  -> Loaded
  -> In transit
  -> Arrived delivery
  -> Delivered
  -> POD pending
  -> Complete
```

The mobile interface uses large actions, explicit confirmations, consented tracking, camera/document architecture, and an instruction not to interact while driving.

## Load lifecycle

```text
Posted -> Bidding -> Awarded/Instant booked -> Funded
       -> Driver assignment -> Pickup execution -> In transit
       -> Delivery/POD -> Customer confirmation -> Settlement eligibility
```

Instant booking uses a serializable database transaction and conditional load update so only one provider can win. Competing offers close in the same transaction.

## Tracking architecture

- Driver must be assigned and explicitly consent.
- Tracking is refused before acceptance, after decline, and after completion.
- Participants receive the latest approximate position, ETA, status, and update time.
- Points carry a 30-day retention expiry for future cleanup jobs.
- Exact historical positions are not exposed publicly.
- Geofences create suggested events only.

## Verification report

Passed:

- Prisma format
- Prisma schema validation
- Prisma client generation
- Backend syntax check
- Backend tests: 58/58
- Frontend tests: 6/6
- Frontend ESLint: passed with zero lint-command warnings
- Next.js production build: passed; `/app/one` generated

Build notes:

- Next emitted pre-existing framework warnings about hook dependencies, `<img>`, and one `aria-disabled` use.
- Static generation logged two handled `ECONNREFUSED` fetches because the local API was not running; the build still completed successfully.
- The additive SQL migration was not applied to the live Render database and no deployment occurred.
- A database-backed end-to-end test of posting, bidding, assignment, tracking, POD, and settlement remains required in a disposable/local test database before deployment.

## Manual test checklist

1. Apply the additive migration to a disposable database.
2. Create Driver, Carrier, Broker, and Customer accounts.
3. Complete provider payout verification for the carrier.
4. Customer posts a load with an optional instant-book price.
5. Carrier posts truck capacity; broker searches the approximate listing.
6. Carrier offers; poster counters; carrier counters; poster accepts.
7. Repeat with instant book and verify the second concurrent attempt fails.
8. Winning carrier assigns a Driver and Truck.
9. Driver accepts and advances every status without skipping.
10. Driver grants consent, submits a point, and participant sees rounded coordinates.
11. Stranger and unassigned driver are denied tracking access.
12. Create geofence suggestions and confirm no status changes automatically.
13. Upload BOL, photo, damage record, and POD metadata; verify participant access and audit event.
14. Customer confirms delivery; verify settlement eligibility and existing ledger behavior.
15. Submit reviews and confirm public reputation excludes internal risk signals.
16. Verify tenant A cannot reach tenant B SaaS records; Loadlyx marketplace records remain platform-owned.

## Remaining blockers before Prompt 2

- Apply and exercise the migration on a disposable PostgreSQL database.
- Add provider-backed private object storage and signed URL issuance for document bytes; this phase stores validated private document metadata and expects a storage adapter URL.
- Add real push/SMS/email providers; current notification architecture is ready but providers remain environment-dependent.
- Add route/geocoding provider and background retention cleanup.
- Complete browser E2E across all roles and concurrent instant-book requests.

Recommended branch: `feature/loadlyx-one-phase-1`

Recommended commit: `Build Loadlyx One freight marketplace and driver execution foundation`
