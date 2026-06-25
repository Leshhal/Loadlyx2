# Loadlyx Phase 1 SaaS + Stripe Active

This package is the current Phase 1 baseline for Loadlyx.

## Included
- Multi-tenant architecture
- SEO-ready store with product pages, tags, images, and schema markup
- Quote system with rules-based upsells
- Automatic pending load generation from quotes
- Attribution tracking on quotes and orders
- SaaS-style admin dashboard and management console
- Stripe Checkout integration for store orders
- Stripe webhook support for paid order confirmation

## Run locally
### Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

### Start Stripe webhook forwarding
```bash
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

Open:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Admin dashboard: `http://localhost:3000/admin/dashboard`


## Roadmap update

### Phase 1.5
- Public load feed at `/loads` and `/loads/[id]`
- Carrier signup placeholder at `/carriers/signup`
- Public-load SEO and carrier interest capture

### Phase 2
- Mover lead marketplace and lead unlocks
- Carrier profiles and carrier dashboard
- Public feed monetization and claim workflow

### Phase 3
- Carrier matching engine
- Carrier bidding
- Stripe Connect marketplace payouts

### Phase 4
- Quote widget network
- Partner referrals and affiliate payouts
