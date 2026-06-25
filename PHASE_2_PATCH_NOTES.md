# Loadlyx Phase 2 Patch Notes

## Implemented in this ZIP

### 1. SaaS homepage on `loadlyx.com`
- Root homepage now behaves differently for:
  - root domain (`loadlyx.com`) -> SaaS marketing page
  - tenant subdomain (`tenant.loadlyx.com`) -> tenant-branded landing page
- SaaS page includes:
  - hero
  - free tier / paid tier cards
  - CTA buttons
  - product / load board / quote messaging

### 2. Tenant Experience admin UI
- Added new page: `frontend/app/admin/tenant/page.jsx`
- Tenant admins can now update:
  - tenant name
  - subdomain
  - primary domain
  - logo URL
  - hero title + subtitle
  - promo banner
  - trust headline + trust copy
  - service heading
  - primary / accent colors
  - free shipping threshold
  - sale countdown end date
  - page image URL
- Added backend endpoints:
  - `GET /api/admin/tenant-settings`
  - `PUT /api/admin/tenant-settings`

### 3. Tenant public profile endpoint
- Added backend endpoint:
  - `GET /api/tenant/public`
- Used by:
  - tenant landing page
  - header branding
  - catalog conversion messaging
  - product detail trust / promo display

### 4. Store conversion layer
- Added promo banner support in catalog and product detail page
- Added countdown timer component
- Added low-stock indicator
- Added free-shipping threshold messaging
- Added bundle / conversion badges on catalog cards

### 5. Shipping API foundation
- Added backend route:
  - `POST /api/shipping/quote`
- Added provider abstraction in `backend/src/utils/shipping.js`
- Checkout now requests shipping quote preview and displays options
- Current behavior:
  - manual / placeholder estimate available immediately
  - FedEx / DHL / Canada Post are scaffolded for future live credentials

### 6. Tenant-aware branding in header
- Public header now loads tenant logo / name when on tenant subdomain

## Important note
- FedEx / DHL / Canada Post live rates are NOT fully active without carrier credentials.
- This ZIP includes the API foundation and checkout integration points needed to wire them later.
