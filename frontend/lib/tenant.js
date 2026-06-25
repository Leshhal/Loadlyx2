export function getTenantSlug() {
  if (typeof window === 'undefined') return null;

  const host = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname || '';

  if (pathname.startsWith('/tenant/')) {
    const [, , slug] = pathname.split('/');
    return slug || null;
  }

  if (host.endsWith('.loadlyx.com')) {
    return host.replace('.loadlyx.com', '');
  }

  if (host === 'loadlyx.com' || host === 'www.loadlyx.com') {
    return null;
  }

  if (host === 'localhost' || host === '127.0.0.1') {
    return localStorage.getItem('tenantSlug');
  }

  return null;
}
