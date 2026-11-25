export function commerceProfile(tenant) {
  return tenant?.brandingJson?.businessType === 'COMMERCE'
    ? tenant.brandingJson.commerce || { entitlements: {}, storefront: { status: 'SETUP_REQUIRED' } }
    : null;
}

export function tenantProfile(tenant) {
  const commerce = commerceProfile(tenant);
  return {
    businessType: tenant?.brandingJson?.businessType || null,
    commerce: commerce ? {
      version: commerce.version,
      entitlements: commerce.entitlements || {},
      storefront: { status: commerce.storefront?.status || 'SETUP_REQUIRED' }
    } : null
  };
}

export function publicStorefrontAvailable(tenant) {
  const commerce = commerceProfile(tenant);
  return Boolean(tenant?.isActive !== false) && (!commerce || commerce.storefront?.status === 'LIVE');
}

export function commerceCapabilityAllowed(tenant, capability) {
  const commerce = commerceProfile(tenant);
  return !commerce || commerce.entitlements?.[capability] === true;
}
