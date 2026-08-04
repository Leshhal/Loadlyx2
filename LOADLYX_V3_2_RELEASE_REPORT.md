# Loadlyx v3.2 Backend, AI Operating System and Platform Integration

## 1. Versioned deliverable

Source package: `loadlyx-v3.2-backend-ai-integration-source-not-launch-candidate.zip`

## 2. Launch-candidate status

**NOT A LAUNCH CANDIDATE — BLOCKED**

The backend foundations, schema, clean migration chain, unit tests, integration smoke test and preserved frontend build are verified. Public launch remains blocked by the inherited vulnerable Next.js 14.2.15 dependency and by external providers that cannot be verified without credentials. Two patched Next.js installation attempts timed out and were not represented as successful.

## 3. Repository audit

The verified v3.1 source already included authentication, roles, tenant routing, financial allocation and ledger services, three plans, Stripe checkout/webhooks, crypto invoice state logic, marketplace actor workflows, simulation safety, themes, uploads, reviews, disputes, connection privacy, AI provider adapters and 41 existing backend tests. v3.2 extends these foundations without duplicating them.

## 4. Backend architecture

- Express API and Prisma/PostgreSQL remain authoritative.
- Protected requests revalidate current user role, account state and tenant state from the database.
- Tenant scope is derived from authenticated membership; non-platform users cannot select another tenant ID.
- New `/api/operating-system` APIs expose workflows, jobs, agents, recommendations, approvals, notifications, inventory, totes, passes and outcome metrics.
- `/api/health` and `/api/health/ready` expose liveness and database readiness separately.

## 5. AI architecture

The existing disabled/mock/OpenAI-compatible provider interface is retained. New versioned agent definitions store approved instructions, allowed roles, schema versions, confidence thresholds and deterministic policies. Recommendations persist the provider/model, input hash/references, structured output, confidence, risk, review reasons and version metadata.

## 6. Agent registry

The idempotent v3.2 seed defines disabled-by-default Quote, Pricing, Dispatch, Sales Follow-up, Upsell, Support and Executive agents. No agent is enabled globally merely by migration.

## 7. Workflow engine

Workflow definitions are tenant/global scoped and versioned. Runs are unique per workflow/event. Supported step types are condition, action, delay and approval. Only allow-listed actions execute; arbitrary code is rejected.

## 8. Event catalogue

The catalogue includes user, tenant, lead, quote, deposit, load, carrier, order, review, payout, refund and subscription lifecycle events listed in `src/services/eventBus.js`. Events require unique idempotency keys and carry correlation/causation metadata.

## 9. Queue and worker

One PostgreSQL durable queue was selected instead of installing competing queue systems. Workers claim rows with `FOR UPDATE SKIP LOCKED`, use bounded exponential retries, persist failure visibility, and dead-letter exhausted jobs. Run separately with `npm run worker`.

## 10. Authentication report

- Existing password, refresh-token, verification and reset flows remain.
- Protected requests reject suspended users and suspended tenants immediately.
- Tenant signup now atomically provisions subscription, commission, AI, simulation and audit defaults.
- Optional passkeys use SimpleWebAuthn v13.3.1, single-use five-minute challenges, signature verification, counters, replay protection, multiple named credentials and audit logs.
- Password login remains available.

## 11. Tenant routing report

Existing normalized/reserved slug protection and hostname middleware remain. v3.2 enforces tenant scope in the new APIs and provisions `slug` and `subdomain` together. Wildcard DNS and hosting configuration remain deployment responsibilities.

## 12. Prisma migration summary

- `20260802010000_v3_2_operating_system`: additive operating-system tables, enums, indexes and foreign keys.
- `20260802015000_user_role_enum_reconciliation`: commits historically missing enum values separately for PostgreSQL safety.
- `20260802020000_schema_history_reconciliation`: idempotently reconciles authentication columns/tables missing from historical SQL.

## 13. Production migration plan

1. Back up production PostgreSQL and restore it into staging.
2. Run `npx prisma migrate status`.
3. Inspect whether production previously used `prisma db push`; the reconciliation migration is idempotent for those objects.
4. Run `npx prisma migrate deploy` against staging.
5. Run `npm run prisma:seed:v3.2` (creates disabled registries only).
6. Run API and worker smoke tests.
7. Repeat during a controlled production window.
8. Never use `prisma migrate reset` in production.

## 14–17. Money flow, ledger, commissions and reconciliation

Existing immutable `FinancialTransaction` and `LedgerEntry` architecture is retained. Existing tests prove store and marketplace allocations, taxes, processor fees, commissions, tenant/broker/carrier proceeds, idempotent settlement and partial-refund balancing. v3.2 does not let AI mutate settled money. Manual approval remains mandatory for refunds, compensation and disputes.

## 18. Crypto report

Existing provider abstraction, invoice states, confirmation thresholds, signed webhook verification and idempotent webhook records remain. Only mock/test behavior was locally verified. Live provider settlement and refunds are **NOT EXTERNALLY VERIFIED**.

## 19. Simulation report

Existing simulated records are explicitly marked, watermarked and isolated from payments, payouts, notifications, ratings and revenue. Global/tenant controls and reset APIs remain platform-role protected.

## 20. Tote-rental report

Added tenant-owned tote assets, hashed QR tokens, reservations, rental items, deposits/replacement amounts, lifecycle events and strict state transitions. Cross-tenant tote selection is rejected and reservation occurs atomically.

## 21. Theme-management report

Existing controlled manifests, approval, activation and rollback remain. Arbitrary server-side theme code is not executed. No new executable package system was introduced.

## 22. File-storage report

Existing provider abstraction and tenant ownership checks remain. Current local provider and configured remote provider hooks are preserved. Production cloud credentials and malware scanning are **NOT EXTERNALLY VERIFIED**.

## 23. Real-time map report

Existing heartbeat and privacy-safe marker APIs remain. Raw IP addresses are not stored; approximate locations and access auditing are preserved. Live carrier/driver GPS provider integration is **NOT EXTERNALLY VERIFIED**.

## 24. Passkey report

Backend registration/options/verification/authentication/list/remove APIs are implemented. Production RP ID/origin must be configured. Browser ceremony and production-domain verification remain **NOT EXTERNALLY VERIFIED**.

## 25. Digital-pass report

Added tenant-scoped pass records, unique serials, signed internal QR tokens, upsert/idempotency and expiry. Apple/Google creation fails closed until credentials exist; those providers are **NOT EXTERNALLY VERIFIED**.

## 26. Inventory and fulfilment report

Added locations, on-hand/reserved/available stock, reorder thresholds, supplier metadata and immutable movement history. Deterministic invariants reject negative stock and reservations exceeding on-hand quantity.

## 27. Notification report

Added durable in-app/email/SMS/push notification records, templates keys, idempotency, read state, delivery state and retry visibility. External channel adapters fail closed when not configured.

## 28. Admin API report

Existing platform administration remains. New APIs expose job health, integration status, workflow history, AI approvals, notifications, inventory, totes, passes and traceable outcome metrics. Sensitive writes require a write-capable role and audit history.

## 29. Environment variables

See `backend/.env.example` and `frontend/.env.local.example`. Required backend values are `DATABASE_URL`, `JWT_SECRET` and `FRONTEND_URL`. Production validates a minimum 32-character JWT secret. Optional provider variables are grouped by AI, passkeys, notifications, payments, storage, maps and wallet passes.

## 30. Local setup

1. Copy example environment files without committing the copies.
2. Start the dedicated Loadlyx PostgreSQL container on its project-specific port.
3. In backend: `npm install`, `npm run prisma:generate`, `npx prisma migrate deploy`, `npm run prisma:seed:v3.2`, `npm run start`.
4. In a second backend process: `npm run worker`.
5. In frontend: `npm ci`, `npm run dev`.

## 31–34. Preview, production, webhooks and workers

- Deploy API and worker as separate processes using the same database and release.
- Run one worker initially; horizontal workers are safe because jobs use row locks.
- Configure HTTPS origins, wildcard tenant domain, secure cookies and passkey RP ID.
- Preserve raw-body handling for Stripe webhooks and set unique webhook secrets.
- Route AI/notification/crypto provider callbacks only to HTTPS endpoints.
- Monitor dead-lettered jobs and provider failures before enabling workflows.

## 35. Changed files

Changed source is limited to backend schema/migrations, dependencies, authentication/health/server integration, the new operating-system/passkey routes, service modules, worker, seeds, tests, environment examples and this report. The approved UI source was not redesigned.

## 36. API endpoint summary

New endpoint groups:

- `/api/passkeys/registration/options|verify`
- `/api/passkeys/authentication/options|verify`
- `/api/passkeys` list/remove
- `/api/operating-system/catalog/events`
- `/api/operating-system/events`
- `/api/operating-system/workflows` and `/workflow-runs`
- `/api/operating-system/jobs` and `/jobs/health`
- `/api/operating-system/ai/agents` and `/ai/recommendations`
- `/api/operating-system/approvals`
- `/api/operating-system/notifications`
- `/api/operating-system/inventory`
- `/api/operating-system/totes` and `/tote-rentals`
- `/api/operating-system/digital-passes`
- `/api/operating-system/metrics/outcomes`
- `/api/operating-system/admin/integrations`
- `/api/health/ready`

## 37. Database-table summary

Added: `AiAgentDefinition`, `AiRecommendation`, `ApprovalRequest`, `PlatformEvent`, `WorkflowDefinition`, `WorkflowRun`, `BackgroundJob`, `Notification`, `PasskeyCredential`, `WebAuthnChallenge`, `DigitalPass`, `ToteAsset`, `ToteRental`, `ToteRentalItem`, `ToteLifecycleEvent`, `InventoryLocation`, `InventoryStock`, `InventoryMovement`, and `MetricSnapshot`.

## 38. Manual test checklist

- Test every role and tenant boundary with real accounts.
- Test passkey register/login/remove on the production domain.
- Enable one agent and workflow in staging only; verify approval behavior.
- Exercise a retrying and dead-lettered job.
- Verify notification provider callbacks and unsubscribes.
- Reconcile deterministic store/marketplace examples.
- Test duplicate payment and webhook delivery.
- Test tote reservation, return, cleaning, damage and lost states.
- Test inventory reservation and fulfilment concurrency.
- Verify map privacy and retention.
- Verify all 51 v3.1 routes at desktop/mobile widths.

## 39. Regression report

- Frontend tests: 3/3 passed.
- Frontend production build: passed; all 51 routes generated.
- Backend tests: 46/46 passed.
- Backend syntax check: passed.
- Prisma generate/validate: passed.
- Clean PostgreSQL migration deployment: passed after reconciliation.
- Integration smoke: passed for agent/workflow seeds, tenant scope, event/job idempotency and job claim/completion.

## 40–41. Known limitations and external services

- Next.js 14.2.15 in the inherited frontend has known high/critical advisories. Upgrade attempts to 16.2.12 timed out twice; this remains a launch blocker.
- AI, Stripe live settlement, email/SMS/push, maps/IP geolocation, cloud storage, crypto provider, Apple Wallet and Google Wallet require credentials and sandbox verification.
- Passkey browser ceremony was not tested against a deployed RP domain.
- The combined hidden-process readiness harness did not observe readiness, although foreground API startup was confirmed and database integration passed.

## 42. Rollback

Database migration rollback is forward-only: restore the pre-deployment backup if the release must be removed. Do not drop new tables after they contain production data. Application rollback can redeploy the prior v3.1 commit because new tables are additive and disabled registries are inert.

## 43–45. Git metadata

- Branch: `release/loadlyx-v3.2-backend-ai-integration`
- Commit: `Implement Loadlyx v3.2 backend, AI orchestration, workflows, money flow, passkeys, totes and platform integrations`
- Tag after blockers clear: `loadlyx-v3.2-backend-rc1`

## 46. Remaining public-launch blockers

1. Upgrade the inherited frontend to a non-vulnerable supported Next.js release and rerun all UI regression checks.
2. Run migration rehearsal against a sanitized copy of the actual production database.
3. Configure and verify each selected external provider in sandbox.
4. Complete authenticated multi-role end-to-end tests.
5. Complete production-domain passkey and wildcard tenant routing tests.
6. Verify API and worker deployment health/alerting in the actual hosting environment.
