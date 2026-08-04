export const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'admin', 'api', 'loadlyx', 'support', 'help', 'mail',
  'billing', 'marketplace', 'store', 'dashboard', 'auth', 'login',
  'signup', 'static', 'assets', 'loads'
]);

export function isLoadboardHostname(host, options = {}) {
  const hostname = hostnameFromHostHeader(host);
  const rootDomain = hostnameFromHostHeader(options.rootDomain || 'loadlyx.com');
  return hostname === `loads.${rootDomain}` || hostname === 'loads.localhost' || hostname === 'loads.loadlyx.local';
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
