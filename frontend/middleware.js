import { NextResponse } from 'next/server';
import { isLoadboardHostname, resolveTenantFromHostname } from './lib/tenantHost';

export function middleware(request) {
const host = request.headers.get('host') || '';
const url = request.nextUrl.clone();
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'loadlyx.com';

if (isLoadboardHostname(host, { rootDomain })) {
  if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/api') || url.pathname.startsWith('/favicon')) return NextResponse.next();
  const loadboardRoutes = { '/': '/loadboard', '/login': '/loadboard/login', '/signup': '/loadboard/signup' };
  url.pathname = loadboardRoutes[url.pathname] || url.pathname;
  const response = NextResponse.rewrite(url);
  response.headers.set('x-loadlyx-site', 'loadboard');
  return response;
}
const subdomain = resolveTenantFromHostname(host, {
  rootDomain,
  allowVercelPreview: process.env.VERCEL_ENV === 'preview'
});

if (!subdomain) {
return NextResponse.next();
}

if (
url.pathname.startsWith('/_next') ||
url.pathname.startsWith('/api') ||
url.pathname.startsWith('/favicon') ||
url.pathname.startsWith('/tenant')
) {
return NextResponse.next();
}

url.pathname = `/tenant/${subdomain}${url.pathname}`;

return NextResponse.rewrite(url);
}

export const config = {
matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
