'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { logoutSession, storeSession } from '../lib/auth';
import { adminFetch } from '../lib/adminFetch';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT', 'TENANT_ADMIN']);
const PLATFORM_ROLES = new Set(['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT']);
const TENANT_ADMIN_PREFIXES = ['/admin/dashboard', '/admin/manage', '/admin/tenant', '/admin/themes', '/admin/seo', '/admin/customers', '/admin/balance', '/admin/payments'];

export default function AdminGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname() || '/admin/dashboard';
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function verifySession() {
      try {
        const response = await adminFetch('/auth/me');
        const data = await response.json();
        const role = data?.user?.role;
        if (!response.ok) {
          if (!cancelled) router.replace(`/login?next=${encodeURIComponent(pathname)}&reason=session-${response.status}`);
          return;
        }
        if (!ADMIN_ROLES.has(role)) {
          if (!cancelled) router.replace('/app/dashboard');
          return;
        }
        storeSession({ user: data.user, tenantSlug: data.user?.tenantSlug || undefined });
        if (PLATFORM_ROLES.has(role) && pathname === '/admin/dashboard') {
          if (!cancelled) router.replace('/admin/platform');
          return;
        }
        if (role === 'TENANT_ADMIN' && !TENANT_ADMIN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
          if (!cancelled) router.replace('/admin/dashboard');
          return;
        }
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) router.replace(`/login?next=${encodeURIComponent(pathname)}&reason=session-network`);
      }
    }
    verifySession();
    return () => { cancelled = true; };
  }, [pathname, router]);

  async function logout() {
    await logoutSession();
    router.replace('/login');
  }

  if (!ready) return <main className="container"><div className="card">Checking session…</div></main>;
  return <>{children}<button className="lx-session-logout" type="button" onClick={logout}>Sign out</button></>;
}
