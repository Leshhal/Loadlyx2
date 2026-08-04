# Loadlyx v3.1 manual UI launch checklist

## Environment

- [ ] Start the dedicated Loadlyx PostgreSQL container.
- [ ] Apply/generate Prisma assets using the existing project setup.
- [ ] Start the backend and confirm database connectivity.
- [ ] Start the frontend using the included launcher.
- [ ] Confirm no `.env` files or secrets are committed.

## Responsive and theme matrix

Repeat the primary workflows at 375, 430, 768, 1024 and 1440 pixels.

- [ ] Light mode is readable and visually complete.
- [ ] Dark mode is readable and visually complete.
- [ ] System mode follows the operating-system preference.
- [ ] Theme preference survives refresh and browser restart.
- [ ] No horizontal page overflow outside intentional data-table containers.
- [ ] Navigation, drawers, forms and action bars remain usable by touch and keyboard.

## Public and authentication

- [ ] Homepage contains all ten conversion sections in order.
- [ ] Homepage and footer CTAs route to real destinations.
- [ ] Pricing tiers, comparison and FAQs render correctly.
- [ ] Login, signup, forgot password, reset password and verification pages render and submit.
- [ ] OAuth buttons are shown only for supported configured flows.
- [ ] Validation, loading, success and error states are announced clearly.

## Role workflows

- [ ] Marketplace User sees customer navigation and cannot access tenant/admin tools.
- [ ] Broker sees broker navigation, CRM and marketplace actions.
- [ ] Carrier sees carrier navigation, bids and dispatch views.
- [ ] Tenant Owner/Staff sees tenant operations based on existing authorization.
- [ ] Support, Admin and Super Admin remain distinct.
- [ ] Protected backend endpoints reject unauthorized access.

## Operational modules

- [ ] Admin overview, platform, finance, balance, users, tenants and health pages load real data.
- [ ] Review moderation and disputes require reasons and create audit records.
- [ ] CRM search, filters and quote status presentation work.
- [ ] Dispatch search, filters and load details work.
- [ ] Load board card/table switching, watchlist, details, posting and role-gated bids work.
- [ ] Store search, category, region and price filters work.
- [ ] Product create/edit/delete and direct image upload work with tenant isolation.
- [ ] Catalog, cart, checkout and order success/cancel flows work.
- [ ] Tenant storefront branding and configured contact/social links render correctly.
- [ ] AI, simulation, crypto, themes and operations map show loading, empty, error and configured states.

## Accessibility and stability

- [ ] Keyboard focus remains visible.
- [ ] Dialogs/drawers can be closed and do not trap users incorrectly.
- [ ] Form inputs have accessible labels.
- [ ] Tables remain understandable on mobile.
- [ ] No repeated console errors, hydration errors or client crashes occur.
- [ ] API failure states explain the problem and do not blank the page.
- [ ] No displayed control appears operational without a real action.

## Sign-off

- [ ] All failures are fixed or documented with owner and priority.
- [ ] Production environment variables and wildcard tenant domains are verified.
- [ ] Final build is generated from the exact commit being released.
- [ ] Status may then be promoted to **LAUNCH CANDIDATE — UI VERIFIED**.
