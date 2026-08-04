# Loadlyx Platform

Loadlyx is a multi-tenant logistics SaaS, storefront, and freight marketplace platform. This repository contains the current integrated application release—not the former Phase 1 baseline.

## Current platform

- Multi-tenant SaaS workspaces and tenant-isolated storefronts
- Tenant subdomain and path-based storefront resolution
- Authentication, session handling, protected routes, and role-aware access
- Platform administration and tenant operations dashboards
- CRM, quotes, customers, dispatch, products, inventory, orders, and fulfilment
- Store checkout, Stripe integration, payment settings, ledgers, and withdrawals
- Freight load board with customer, broker, and carrier workflows
- Marketplace simulation controls and reputation tooling
- Store themes, direct product-image uploads, SEO, and editable tenant content
- YXE Totes rental, inventory, shipping, and security-map foundations
- AI services, approval policies, workflows, event processing, and recommendations
- Crypto checkout provider abstraction and payment-state handling

## Local development

The repository includes guided launchers:

- Windows: `run_loadlyx_auto.bat`
- macOS/Linux: `run_loadlyx_auto.sh`

The launcher prepares project-specific environment files, starts the dedicated PostgreSQL container, installs dependencies, prepares Prisma, and starts the backend and frontend.

Manual startup is also supported.

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
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

Local URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api`
- Platform administration: `http://localhost:3000/admin/dashboard`
- Tenant example: `http://localhost:3000/tenant/demo`
- Load board: `http://localhost:3000/loadboard`

## Verification

```bash
npm test --prefix backend
npm run check --prefix backend
npm test --prefix frontend
npm run build --prefix frontend
```

The current release was verified with 53 backend tests, 6 frontend tenant-routing tests, backend syntax checks, and a successful 60-route production frontend build.

## Configuration and security

Copy the supplied example environment files and provide environment-specific credentials locally or through the deployment provider. Never commit `.env` files, payment secrets, OAuth credentials, database passwords, runtime logs, or generated build output.

See the release reports in the repository root for implementation details, migrations, operational notes, and manual QA coverage.
