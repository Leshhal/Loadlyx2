# Loadlyx Phase 4.5B Provider Infrastructure Report

Status before deployment: **implementation verification in progress**.

## Implemented

- Production passkey configuration now fails closed unless RP ID and HTTPS origin are explicit.
- Transactional email provider abstraction with Resend, legacy webhook, development logger, branded HTML/text verification and reset templates, and production fail-closed behavior.
- OAuth state remains one-time and expiring; Google/Apple use nonce; Apple identity tokens are signature, issuer, audience, expiry, and nonce verified.
- Stripe Connect tenant status refresh records requirements, charges, payouts, restriction, and onboarding state without storing KYC data.
- Tenant checkout remains resolved from server-side tenant middleware. Stripe destination charges preserve the tenant and commission snapshot.
- PayPal Orders/Capture/Refund/Webhook infrastructure uses server-calculated orders, provider authentication, signature verification, event deduplication, and immutable settlement recording.
- Crypto now exposes a unified chain-adapter contract, per-chain readiness, transfer validation, and a background worker handler. No live signing or withdrawal is enabled.
- Provider status center and names-only environment audit endpoints never expose secrets and never equate configuration with live verification.

## Owner external-action checklist

### Google

- Create/select the Google OAuth application.
- Register `https://loadlyx-backend-370s.onrender.com/api/auth/oauth/google/callback`.
- Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` to Render; redeploy.

### Apple

- Configure Sign in with Apple Services ID, `loadlyx.com` domain, and return URL `https://loadlyx-backend-370s.onrender.com/api/auth/oauth/apple/callback`.
- Create the Apple key; add the required client ID/client secret (or generated secret inputs) to Render. Never commit the private key.

### Discord

- Add `https://loadlyx-backend-370s.onrender.com/api/auth/oauth/discord/callback` in the Discord Developer Portal.
- Add `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_REDIRECT_URI` to Render; redeploy.

### Email / Resend

- Verify the sending domain in Resend and publish its DNS records.
- Add `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, and `PUBLIC_APP_URL=https://www.loadlyx.com` to Render.
- Deliver verification and reset emails to a real inbox and complete both links before marking live verified.

### Passkeys

- Set `PASSKEY_RP_ID=loadlyx.com`, `PASSKEY_ORIGIN=https://www.loadlyx.com`, and `PASSKEY_RP_NAME=Loadlyx` on Render.
- Complete register, logout, and re-login from the production domain.

### Stripe

- Confirm Stripe Connect Express is enabled for the platform in test mode.
- Keep webhook destination/signing secret configured; complete onboarding for one tenant and run purchase, decline, duplicate webhook, cumulative refund, ledger, and balance tests.

### PayPal

- Create sandbox REST credentials and webhook; add `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_PARTNER_ATTRIBUTION_ID`, and `PAYPAL_MODE=SANDBOX`.
- Obtain any required PayPal multiparty/partner approval and onboard a sandbox seller. It remains configuration-required until then.

### Crypto

- Choose one chain first, configure its testnet RPC and Loadlyx treasury address, enable the worker queue, and fund only testnet wallets.
- Provision a dedicated custody/signing service before live withdrawals. Private keys and seed phrases must never be stored in Git, frontend variables, ordinary database fields, or logs.

## Environment variable audit (names only)

The authenticated endpoint `/api/operating-system/admin/integrations/environment` reports `PRESENT` or `MISSING` for provider variable names only. It never returns values.

## Truthful provider boundary

- Credential/password authentication can be live-verified separately.
- OAuth, email delivery, passkeys, Stripe Connect, PayPal, and crypto remain waiting for their required external configuration and complete deployed flow tests.
- Crypto withdrawals remain configuration-required until secure custody/signing exists.
