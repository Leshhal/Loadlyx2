export const COMMERCE_PLANS = [
  { code: 'STARTER', name: 'Starter', monthlyPriceCents: 2900, features: ['Storefront and products', 'Orders and inventory', 'Customer management'] },
  { code: 'GROWTH', name: 'Growth', monthlyPriceCents: 5900, features: ['Storefront and products', 'Orders and inventory', 'Customer management', 'Staff access'] },
  { code: 'PROFESSIONAL', name: 'Professional', monthlyPriceCents: 9900, features: ['Storefront and products', 'Orders and inventory', 'Customer management', 'Staff access', 'Advanced reporting'] }
];

export function commerceSignupSelection(search = '') {
  const query = new URLSearchParams(search);
  const code = String(query.get('plan') || '').toUpperCase();
  const planCode = COMMERCE_PLANS.some((plan) => plan.code === code) ? code : 'STARTER';
  return query.get('businessType') === 'COMMERCE'
    ? { role: 'TENANT_ADMIN', businessType: 'COMMERCE', planCode }
    : {};
}

export function monthlyPrice(cents) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(cents / 100);
}
