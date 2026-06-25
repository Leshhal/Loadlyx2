This patch updates the current Loadlyx build to:

1. Prevent tenant users/storefronts from seeing the SaaS homepage when tenant context exists.
2. Split the homepage behavior:
   - root / no tenant context => SaaS homepage
   - tenant context / tenant subdomain / localhost tenantSlug => tenant landing page
3. Update the public header:
   - tenant branding shown only in tenant context
   - SaaS CTAs hidden in tenant context
   - tenant custom page links surfaced in nav
4. Add tenant custom page management inside Admin > Tenant Experience:
   - create pages
   - edit title / slug / nav label / content / hero image
   - show/hide page in nav
5. Add public tenant custom page route:
   - /pages/[slug]

Files changed:
- frontend/app/page.js
- frontend/components/HomeResolver.jsx
- frontend/components/SaasHome.jsx
- frontend/components/Header.jsx
- frontend/components/TenantLanding.jsx
- frontend/app/admin/tenant/page.jsx
- frontend/app/pages/[slug]/page.jsx
