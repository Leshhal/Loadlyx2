import { NextResponse } from 'next/server';

const RESERVED_SUBDOMAINS = [
'www',
'app',
'admin',
'api',
'loadlyx'
];

export function middleware(request) {
const host = request.headers.get('host') || '';
const hostname = host.split(':')[0].toLowerCase();
const url = request.nextUrl.clone();

const isLoadlyxSubdomain =
hostname.endsWith('.loadlyx.com') &&
hostname !== 'www.loadlyx.com';

if (!isLoadlyxSubdomain) {
return NextResponse.next();
}

const subdomain = hostname.replace('.loadlyx.com', '');

if (!subdomain || RESERVED_SUBDOMAINS.includes(subdomain)) {
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
