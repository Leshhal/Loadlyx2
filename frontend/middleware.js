import { NextResponse } from 'next/server';
import { canonicalLoadboardPath, hostnameFromHostHeader, isLoadboardHostname, resolveTenantFromHostname, tenantPathParts } from './lib/tenantHost';

const PASSTHROUGH_PREFIXES = ['/_next', '/api', '/favicon', '/store-assets'];
const passthrough = (pathname) => PASSTHROUGH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

function redirectTo(request, hostname, pathname) {
  const destination = request.nextUrl.clone();
  destination.hostname = hostname;
  destination.port = '';
  destination.protocol = 'https:';
  destination.pathname = pathname;
  return NextResponse.redirect(destination, 308);
}

export function middleware(request) {
  const host = request.headers.get('host') || '';
  const hostname = hostnameFromHostHeader(host);
  const url = request.nextUrl.clone();
  const rootDomain = hostnameFromHostHeader(process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'loadlyx.com');
  const rootHost = hostname === rootDomain || hostname === `www.${rootDomain}`;
  const canonicalLoadboardHost = `loadboard.${rootDomain}`;
  const legacyLoadboardHost = hostname === `loads.${rootDomain}`;

  if (legacyLoadboardHost) {
    return redirectTo(request, canonicalLoadboardHost, canonicalLoadboardPath(url.pathname) || url.pathname);
  }

  if (rootHost) {
    const tenantPath = tenantPathParts(url.pathname);
    if (tenantPath) return redirectTo(request, `${tenantPath.slug}.${rootDomain}`, tenantPath.pathname);
    const loadboardPath = canonicalLoadboardPath(url.pathname);
    if (loadboardPath) return redirectTo(request, canonicalLoadboardHost, loadboardPath);
  }

  if (isLoadboardHostname(host, { rootDomain })) {
    if (passthrough(url.pathname)) return NextResponse.next();
    const nestedPath = canonicalLoadboardPath(url.pathname);
    if (nestedPath) return redirectTo(request, canonicalLoadboardHost, nestedPath);
    const loadboardRoutes = { '/': '/loadboard', '/login': '/loadboard/login', '/signup': '/loadboard/signup' };
    url.pathname = loadboardRoutes[url.pathname] || url.pathname;
    const response = NextResponse.rewrite(url);
    response.headers.set('x-loadlyx-site', 'loadboard');
    return response;
  }

  const subdomain = resolveTenantFromHostname(host, { rootDomain, allowVercelPreview: process.env.VERCEL_ENV === 'preview' });
  if (!subdomain) return NextResponse.next();
  if (passthrough(url.pathname)) return NextResponse.next();

  const nestedTenantPath = tenantPathParts(url.pathname);
  if (nestedTenantPath?.slug === subdomain) return redirectTo(request, `${subdomain}.${rootDomain}`, nestedTenantPath.pathname);
  if (url.pathname.startsWith('/tenant')) return NextResponse.next();

  url.pathname = `/tenant/${subdomain}${url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
