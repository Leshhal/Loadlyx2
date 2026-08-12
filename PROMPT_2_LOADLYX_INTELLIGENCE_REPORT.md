# Loadlyx Intelligence — Prompt 2 Verification Report

Status: SOURCE IMPLEMENTED AND BUILD VERIFIED. DATABASE MIGRATION AND LIVE BROWSER/PROVIDER FLOWS REQUIRE ENVIRONMENT VERIFICATION.

## Matching-engine report

- Explainable load-to-truck and truck-to-load scoring with 0–100 scores.
- Equipment and capacity are eligibility gates, not merely soft preferences.
- Reasons include deadhead, equipment, pickup availability, destination preference, terminal return, rating, lane history, trust, and estimated margin.
- Missing inputs lower confidence and are returned explicitly.
- Matching never awards a load or creates a binding agreement.

## Rate-engine and data-source report

- Uses `LOADLYX_NETWORK_DATA`: posted loads, accepted offers, and their timestamps.
- `THIRD_PARTY_DATA` is separately labeled and disabled until an approved/licensed source is configured.
- No DAT scraping, DAT claims, or fabricated DAT observations.
- Rates include suggested median, interquartile range, rate/mile, 7/30-day averages, trend, confidence, accepted sample count, and source breakdown.
- Fewer than three relevant observations returns `INSUFFICIENT_DATA` and withholds the suggested rate.

## Broker TMS and AI-agent report

- Added broker lifecycle stages from lead/quote through closed.
- Existing quotes, marketplace loads, offers, assignments, documents, payment agreements, and settlement infrastructure remain the source of truth.
- Copilot flags carrier-selection review, missing rate confirmation, and missing POD.
- Negotiation guidance exposes opening, target, walk-away, margin/deadhead context, confidence, and sample size.
- All recommendations are advisory and require explicit human approval.

## Benchmark privacy and network analytics report

- Benchmark cohorts below five members are suppressed.
- Eligible cohorts expose anonymized medians and percentiles only.
- Network analytics aggregate lanes, origin/destination density, equipment demand, supply, demand, posted/accepted rates, and market condition.
- Competitor identities and tenant-specific records are not exposed.

## Model/versioning report

- Model: `loadlyx-freight-intelligence`
- Version: `2.0.0`
- Mode: explainable deterministic rules.
- Recommendation storage records inputs, model/version, data source, result, confidence, explanations, approval requirement, user action, and outcome.

## Verification executed

- `node --test test/freightIntelligence.test.js`: 11/11 passed.
- `npm test`: 69/69 backend tests passed.
- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `npm run lint` in frontend: passed with zero lint-command warnings.
- `npm run build` in frontend: passed; `/app/intelligence` and `/app/broker-tms` generated.

## Remaining limitations

- No approved third-party rate or fuel dataset is configured.
- Deadhead requires a supplied/approved distance; the engine does not invent geocoding results.
- Multi-leg HOS output is labeled an operational estimate, not jurisdiction-certified compliance.
- Migration `20260812180000_loadlyx_intelligence` was validated but not applied to a live/production database.
- Live authenticated API, migration, and browser flows were not externally verified in this source-only release.
- Advanced predictive learning remains evidence collection until sufficient accepted/rejected recommendation outcomes exist.
- Prompt 3 has not been started.
