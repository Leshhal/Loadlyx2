'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/platform', label: 'Platform Ops' },
  { href: '/admin/map', label: 'Operations Map' },
  { href: '/admin/simulation', label: 'Demo Mode' },
  { href: '/admin/ai', label: 'AI' },
  { href: '/admin/crypto', label: 'Crypto' },
  { href: '/admin/manage', label: 'Manage' },
  { href: '/admin/tenant', label: 'Tenant Experience' },
  { href: '/admin/themes', label: 'Store Themes' },
  { href: '/admin/finance', label: 'Finance' },
  { href: '/admin/reputation', label: 'Reviews & Disputes' },
  { href: '/admin/seo', label: 'SEO Tools' }
];

export default function AdminNav() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  if (!isAdmin) return null;

  return (
    <div className="admin-shell-nav">
      <div className="container admin-nav-inner">
        <div>
          <Link href="/admin/dashboard" className="admin-brand">
            <span className="brand-mark">⬒</span>
            <span>Loadlyx Admin</span>
          </Link>
          <div className="admin-subtitle">Tenant operations console</div>
        </div>
        <div className="admin-nav-actions">
          <ThemeToggle />
          <nav className="admin-nav-links">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className={active ? 'admin-link active' : 'admin-link'}>
                {link.label}
              </Link>
            );
          })}
          </nav>
        </div>
      </div>
    </div>
  );
}
