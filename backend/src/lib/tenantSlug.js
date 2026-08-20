export const RESERVED_TENANT_SLUGS = new Set([
  'www', 'admin', 'api', 'app', 'support', 'help', 'mail', 'billing',
  'marketplace', 'store', 'dashboard', 'auth', 'login', 'signup',
  'static', 'assets', 'loadlyx', 'localhost', 'loads', 'loadboard'
]);

export function normalizeTenantSlug(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function validateTenantSlug(value) {
  const slug = normalizeTenantSlug(value);
  if (slug.length < 3 || slug.length > 63) {
    return { ok: false, slug, error: 'Tenant slug must be between 3 and 63 characters' };
  }
  if (RESERVED_TENANT_SLUGS.has(slug)) {
    return { ok: false, slug, error: 'Tenant slug is reserved' };
  }
  return { ok: true, slug };
}
