# Loadlyx Backend - Phase 1 SaaS + Stripe Build

Backend features:
- Multi-tenant API structure using tenant scoping
- PostgreSQL + Prisma ORM
- Product catalog, tags, categories, and SEO fields
- Move quote intake and automatic pending load creation
- Rules-based upsell recommendations from quote comments
- Attribution tracking on quotes and orders
- SaaS-style admin dashboard + management console
- Stripe Checkout for store orders
- Stripe webhook support to mark orders paid
- Cloudflare-ready Express security baseline

## Key order endpoints
- `POST /api/orders/checkout`
- `GET /api/orders/session/:sessionId`
- `POST /api/stripe/webhook`

## Local Stripe webhook forwarding
Use Stripe CLI in a second terminal after the backend is running:

```bash
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

Copy the webhook secret printed by Stripe CLI into `STRIPE_WEBHOOK_SECRET`.
