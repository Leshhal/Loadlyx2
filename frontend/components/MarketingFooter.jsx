'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isLoadboardHostname, resolveTenantFromHostname } from '@/lib/tenantHost';

export default function MarketingFooter() {
  const path = usePathname() || '/';
  const [publicHostResolved, setPublicHostResolved] = useState(false);
  const [specialHost, setSpecialHost] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'loadlyx.com';
    setSpecialHost(Boolean(resolveTenantFromHostname(hostname, { rootDomain })) || isLoadboardHostname(hostname, { rootDomain }));
    setPublicHostResolved(true);
  }, []);

  if (!publicHostResolved || specialHost || path === '/' || path.startsWith('/app') || path.startsWith('/admin') || path.startsWith('/tenant/') || path.startsWith('/loadboard')) return null;
  return <footer className="lx-footer lx-global-footer"><div><Link className="nav-brand" href="/"><span className="brand-mark">L</span><span className="brand-copy">Loadlyx</span></Link><p>Connected logistics operations, commerce, and marketplace workflows.</p></div><nav aria-label="Footer navigation"><div><strong>Explore</strong><Link href="/loadboard">Loadboard</Link><Link href="/solutions">Solutions</Link><Link href="/platform">Platform</Link><Link href="/pricing">Pricing</Link></div><div><strong>Resources</strong><Link href="/resources">Resource center</Link><Link href="/resources/getting-started">Getting started</Link><Link href="/resources/security">Security</Link></div><div><strong>Legal</strong><Link href="/legal/terms">Terms</Link><Link href="/legal/privacy">Privacy</Link><Link href="/legal/marketplace-terms">Marketplace Terms</Link><Link href="/legal/acceptable-use">Acceptable Use</Link><Link href="/legal/cookies">Cookies</Link><Link href="/legal/payments">Payments</Link></div></nav></footer>;
}