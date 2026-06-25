Phase 2 route refactor patch

Implemented:
- Marketing site isolated to /, /solutions, /resources, /pricing
- Unified header so only one nav renders at a time
- Root homepage rebuilt as SaaS marketing page
- App routes added under /app/dashboard, /app/products, /app/quotes, /app/loadboard
- Tenant storefront routes added under /tenant/[slug]
- Tenant custom page route added under /tenant/[slug]/pages/[pageSlug]
- Header hook logic refactored to avoid early return before hooks
- Theme toggle switched to html class-based dark/light handling
- Product management UI added to /app/products with list/create/edit/delete
- Backend tenant lookup route added: /api/tenant/by-slug/:slug

Notes:
- Existing legacy routes were left in place for compatibility, but the new separated structure is now available.
- AdminNav component remains in codebase but is no longer mounted by root layout.
