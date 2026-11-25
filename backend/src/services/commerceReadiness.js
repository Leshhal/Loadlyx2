import { commerceProfile } from './commerceAccess.js';

export function commerceReadiness(tenant, productCount) {
  const profile = commerceProfile(tenant);
  if (!profile) return null;
  const branding = tenant.brandingJson || {};
  const checklist = [
    { key: 'business', label: 'Business details', complete: Boolean(tenant.name && profile.ownerUserId) },
    { key: 'branding', label: 'Store branding', complete: Boolean(branding.logoUrl && branding.contactEmail) },
    { key: 'domain', label: 'Verify subdomain routing and HTTPS', complete: false, status: 'EXTERNAL_VERIFICATION_REQUIRED' },
    { key: 'payments', label: 'Connect and validate payment provider', complete: false, status: 'OWNER_PROVIDER_CONFIGURATION_REQUIRED' },
    { key: 'shipping', label: 'Configure and validate shipping', complete: false, status: 'IMPLEMENTATION_REQUIRED' },
    { key: 'tax', label: 'Configure and validate tax state', complete: false, status: 'OWNER_CONFIGURATION_REQUIRED' },
    { key: 'products', label: 'Add active products', complete: productCount > 0 },
    { key: 'testCheckout', label: 'Verify sandbox order, ledger and refund', complete: false, status: 'VERIFICATION_REQUIRED' },
    { key: 'publish', label: 'Publish store', complete: false, status: 'READINESS_BLOCKED' }
  ].map((item) => ({ ...item, status: item.status || (item.complete ? 'COMPLETE' : 'SETUP_REQUIRED') }));
  return {
    storefrontStatus: profile.storefront?.status || 'SETUP_REQUIRED',
    ready: false,
    checklist,
    blockers: checklist.filter((item) => !item.complete).map((item) => ({ key: item.key, status: item.status }))
  };
}
