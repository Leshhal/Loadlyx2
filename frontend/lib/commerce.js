export const BUSINESS_TYPES = [
  ['COMMERCE', 'Online Store / Commerce'],
  ['MOVING_SERVICE', 'Moving / Service Business'],
  ['MARKETPLACE_LOGISTICS', 'Marketplace / Logistics']
];

export function signupPayload(form) {
  const { passwordConfirmation, businessType, planCode, ...payload } = form;
  return {
    ...payload,
    tenantSlug: form.role === 'TENANT_ADMIN' ? form.tenantSlug || undefined : undefined,
    businessType: form.role === 'TENANT_ADMIN' ? businessType : undefined,
    planCode: form.role === 'TENANT_ADMIN' && businessType === 'COMMERCE' ? planCode : undefined
  };
}

export function commerceProfile(user) {
  const profile = user?.tenantProfile;
  if (profile?.businessType !== 'COMMERCE') return null;
  return profile.commerce?.version === 1
    ? profile.commerce
    : { entitlements: {}, storefront: { status: 'SETUP_REQUIRED' } };
}

export function productClassification(user) {
  return { isMovingSupply: !commerceProfile(user), isFurniture: false };
}

export function commerceNavigation(user) {
  const profile = commerceProfile(user);
  if (!profile) return null;
  const entitlements = profile.entitlements || {};
  const links = [['Dashboard', '/admin/dashboard', 'chart']];
  const modules = [
    ['orders', 'Orders', '/admin/manage/orders', 'store'],
    ['products', 'Products & inventory', '/app/products', 'store'],
    ['categories', 'Categories', '/admin/manage/categories', 'store'],
    ['customers', 'Customers', '/admin/customers', 'users'],
    ['ledger', 'Financial ledger & withdrawals', '/admin/balance', 'chart'],
    ['payments', 'Payment connections', '/admin/payments', 'chart'],
    ['payments', 'Subscription & billing', '/admin/billing', 'chart'],
    ['storefront', 'Store themes', '/admin/themes', 'store'],
    ['analytics', 'Store analytics', '/admin/dashboard#analytics', 'chart'],
    ['storefront', 'Store settings & branding', '/admin/tenant', 'store']
  ];
  for (const [capability, label, href, icon] of modules) {
    if (entitlements[capability] === true) links.push([label, href, icon]);
  }
  links.push(['Support', '/resources', 'users']);
  return links;
}

export function commercePathAllowed(user, pathname) {
  const navigation = commerceNavigation(user);
  if (!navigation) return true;
  return navigation.some(([, href]) => {
    const route = href.split('#')[0];
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}
