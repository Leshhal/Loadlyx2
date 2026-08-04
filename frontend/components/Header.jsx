'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { apiFetch } from '@/lib/api';

const MARKETING_PATHS = new Set(['/', '/solutions', '/resources', '/pricing']);

const marketingLinks = [
  { href: '/loadboard', label: 'Load Board' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/resources', label: 'Resources' },
  { href: '/pricing', label: 'Pricing' }
];

const appLinks = [
  { href: '/app/dashboard', label: 'Dashboard' },
  { href: '/app/products', label: 'Products' },
  { href: '/app/quotes', label: 'Quotes' },
  { href: '/app/loadboard', label: 'Load Board' }
];

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/manage', label: 'Manage' },
  { href: '/admin/tenant', label: 'Tenant Experience' },
  { href: '/admin/seo', label: 'SEO Tools' }
];

function getRouteMode(pathname = '/') {
  if (pathname === '/loadboard' || pathname.startsWith('/loadboard/')) return 'loadboard';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/app')) return 'app';
  if (pathname.startsWith('/tenant/')) return 'tenant';
  if (MARKETING_PATHS.has(pathname)) return 'marketing';
  return 'marketing';
}

export default function Header() {
  const pathname = usePathname() || '/';
  const [tenantProfile, setTenantProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadboardHost, setLoadboardHost] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    setLoadboardHost(hostname === 'loads.localhost' || hostname === 'loads.loadlyx.local' || hostname.startsWith('loads.'));
  }, []);

  const routeMode = useMemo(() => loadboardHost ? 'loadboard' : getRouteMode(pathname), [loadboardHost, pathname]);
  const tenantSlug = useMemo(() => {
    if (routeMode !== 'tenant') return null;
    const [, , slug] = pathname.split('/');
    return slug || null;
  }, [routeMode, pathname]);

  useEffect(() => {
    let cancelled = false;

    async function loadTenantProfile() {
      if (routeMode !== 'tenant' || !tenantSlug) {
        if (!cancelled) setTenantProfile(null);
        return;
      }

      try {
        const data = await apiFetch(`/tenant/by-slug/${tenantSlug}`);
        if (!cancelled) setTenantProfile(data);
      } catch {
        if (!cancelled) setTenantProfile(null);
      }
    }

    loadTenantProfile();
    return () => {
      cancelled = true;
    };
  }, [routeMode, tenantSlug]);

  const tenantLinks = useMemo(() => {
    if (!tenantSlug) return [];

    const base = [
      { href: `/tenant/${tenantSlug}`, label: 'Home' },
      { href: `/tenant/${tenantSlug}/catalog`, label: 'Store' },
      { href: `/tenant/${tenantSlug}/loadboard`, label: 'Load Board' },
      { href: `/tenant/${tenantSlug}/quote`, label: 'Get a Quote' }
    ];

    const customPages = (tenantProfile?.branding?.tenantPages || [])
      .filter((page) => page?.slug && page?.showInNav !== false)
      .slice(0, 4)
      .map((page) => ({
        href: `/tenant/${tenantSlug}/pages/${page.slug}`,
        label: page.navLabel || page.title
      }));

    return [...base, ...customPages];
  }, [tenantSlug, tenantProfile]);

  const currentLinks =
    routeMode === 'admin' ? adminLinks :
    routeMode === 'app' ? appLinks :
    routeMode === 'tenant' ? tenantLinks :
    routeMode === 'loadboard' ? [
      { href: '/loadboard', label: 'Browse Loads' }
    ] : marketingLinks;

  const brandText =
    routeMode === 'admin' ? 'Loadlyx Admin' :
    routeMode === 'app' ? 'Loadlyx App' :
    routeMode === 'tenant' ? (tenantProfile?.name || 'Tenant Storefront') :
    routeMode === 'loadboard' ? 'Freight Exchange' : 'Loadlyx';

  const brandHref =
    routeMode === 'admin' ? '/admin/dashboard' :
    routeMode === 'app' ? '/app/dashboard' :
    routeMode === 'tenant' && tenantSlug ? `/tenant/${tenantSlug}` :
    routeMode === 'loadboard' ? '/loadboard' : '/';

  const loadboardAuthPath = pathname.startsWith('/loadboard/login') || pathname.startsWith('/loadboard/signup') || (loadboardHost && ['/login', '/signup'].includes(pathname));
  if (routeMode === 'admin' || routeMode === 'app' || loadboardAuthPath) return null;

  return (
    <header className="header">
      <div className={`container nav ${menuOpen ? 'mobile-open' : ''}`}>
        <Link href={brandHref} className="nav-brand">
          {routeMode === 'tenant' && tenantProfile?.branding?.logoUrl ? (
            <img src={tenantProfile.branding.logoUrl} alt={brandText} className="tenant-logo" />
          ) : (
            <span className="brand-mark">⬒</span>
          )}
          <span className="brand-copy">{brandText}</span>
          {routeMode === 'loadboard' ? <small className="lx-powered-by">Powered by Loadlyx</small> : null}
        </Link>

        <button className="lx-public-menu" type="button" aria-expanded={menuOpen} aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>☰</button>

        <nav className="nav-links" aria-label="Primary navigation">
          {currentLinks.map((link) => {
            const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(`${link.href}/`)) || pathname === link.href;
            return (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={active ? 'nav-link active-nav' : 'nav-link'}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="nav-actions">
          <ThemeToggle />
          {routeMode === 'marketing' ? (
            <>
              <Link href="/login" className="nav-link">Sign in</Link>
              <Link href="/signup" className="btn">Start free</Link>
            </>
          ) : null}
          {routeMode === 'loadboard' ? <Link href="/loadboard/login?next=/app/dashboard" className="btn">Sign in</Link> : null}
          {routeMode === 'tenant' ? <Link href="/admin/dashboard" className="nav-link">Tenant Admin</Link> : null}
        </div>
      </div>
    </header>
  );
}
