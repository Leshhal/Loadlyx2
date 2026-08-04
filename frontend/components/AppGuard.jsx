'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/adminFetch';
import { storeSession } from '@/lib/auth';

export default function AppGuard({ children }) {
  const pathname = usePathname() || '/app/dashboard';
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminFetch('/auth/me').then(async (response) => {
      if (!response.ok) throw new Error('Authentication required');
      const data = await response.json();
      storeSession({ user: data.user, tenantSlug: data.user?.tenantSlug || undefined });
      if (!cancelled) setReady(true);
    }).catch(() => {
      if (cancelled) return;
      const freightHost = window.location.hostname === 'loads.localhost' || window.location.hostname.startsWith('loads.');
      router.replace(`${freightHost ? '/loadboard/login' : '/login'}?next=${encodeURIComponent(pathname)}`);
    });
    return () => { cancelled = true; };
  }, [pathname, router]);

  return ready ? children : <main className="container"><div className="card">Checking account access…</div></main>;
}
