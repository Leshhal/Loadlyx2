# Loadlyx Crypto Checkout Report

## Decision

**Crypto architecture and test checkout implemented — real providers not externally verified.**

## Delivered

- Tenant enable/disable, accepted assets, confirmation threshold, and expiry controls.
- BTC, ETH, SOL, ADA, USDC, and USDT configuration.
- Invoice, address, QR payload, locked conversion rate, polling status, and transaction hash records.
- Created, awaiting, confirming, paid, underpaid, overpaid, expired, failed, and refund states.
- HMAC webhook verification and provider-event idempotency.
- Orders settle only after confirmation requirements; ledger integration is idempotent.
- Existing card checkout remains available.
- Deterministic MOCK provider for safe testing only.

## Verification

- Backend tests: 32 passed, 0 failed.
- Quote, confirmation, underpayment, overpayment, expiry, signature, and mock-invoice tests: passed.
- Prisma validation and backend syntax checks: passed.

## External verification

- No real crypto processor adapter or credentials were supplied.
- MOCK addresses do not collect funds.
- Real provider webhook formats, raw-body signatures, refunds, and network confirmations remain not externally verified.

## Suggested release metadata

- Branch: `release/loadlyx-crypto-checkout`
- Commit: `Add confirmation-safe tenant crypto checkout and reconciliation`
- Tag after real-provider staging verification: `loadlyx-crypto-checkout-rc1`
