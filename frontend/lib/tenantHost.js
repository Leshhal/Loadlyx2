export const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'admin', 'api', 'loadlyx', 'support', 'help', 'mail',
  'billing', 'marketplace', 'store', 'dashboard', 'auth', 'login',
  'signup', 'static', 'assets', 'loads', 'loadboard'
]);

export function isLoadboardHostname(host, options = {}) {
  const hostname = hostnameFromHostHeader(host);
  const rootDomain = hostnameFromHostHeader(options.rootDomain || 'loadlyx.com');
  return [`loadboard.${rootDomain}`, `loads.${rootDomain}`, 'loadboard.localhost', 'loads.localhost', 'loadboard.loadlyx.local', 'loads.loadlyx.local'].includes(hostname);
}

export function hostnameFromHostHeader(host = '') {
  return String(host).trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

export function resolveTenantFromHostname(host, options = {}) {
  const hostname = hostnameFromHostHeader(host);
  const rootDomain = hostnameFromHostHeader(options.rootDomain || 'loadlyx.com');
  let candidate = null;

  if (hostname.endsWith('.localhost')) {
    candidate = hostname.slice(0, -'.localhost'.length);
  } else if (hostname.endsWith('.loadlyx.local')) {
    candidate = hostname.slice(0, -'.loadlyx.local'.length);
  } else if (rootDomain && hostname.endsWith(`.${rootDomain}`)) {
    candidate = hostname.slice(0, -(rootDomain.length + 1));
  } else if (options.allowVercelPreview && hostname.endsWith('.vercel.app')) {
    const deploymentLabel = hostname.split('.')[0];
    candidate = deploymentLabel.includes('---') ? deploymentLabel.split('---')[0] : null;
  }

  if (!candidate || candidate.includes('.') || RESERVED_SUBDOMAINS.has(candidate)) return null;
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(candidate) ? candidate : null;
}

export function tenantPathParts(pathname = '') {
  const pathOnly = String(pathname).split('?')[0];
  const match = pathOnly.match(/^\/tenant\/([^/]+)(\/.*)?$/i);
  if (!match) return null;
  let slug;
  try { slug = decodeURIComponent(match[1]).trim().toLowerCase(); } catch { return null; }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) || RESERVED_SUBDOMAINS.has(slug)) return null;
  return { slug, pathname: match[2] || '/' };
}

export function canonicalLoadboardPath(pathname = '') {
  const pathOnly = String(pathname).split('?')[0];
  if (pathOnly === '/loadboard' || pathOnly === '/loadboard/') return '/';
  return pathOnly.startsWith('/loadboard/') ? pathOnly.slice('/loadboard'.length) : null;
}
