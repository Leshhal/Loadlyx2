'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getTenantSlug } from '@/lib/tenant';
import TenantLanding from './TenantLanding';
import SaasHome from './SaasHome';

export default function HomeResolver({ initialTenant = null }) {
  const [tenant, setTenant] = useState(initialTenant);
  const [resolved, setResolved] = useState(Boolean(initialTenant));

  useEffect(() => {
    let cancelled = false;

    async function resolveTenant() {
      const slug = getTenantSlug();
      if (!slug) {
        if (!cancelled) setResolved(true);
        return;
      }

      try {
        const data = await apiFetch('/tenant/by-slug/${getTenantSlug()}');
        if (!cancelled) setTenant(data);
      } catch {
        if (!cancelled) setTenant(null);
      } finally {
        if (!cancelled) setResolved(true);
      }
    }

    if (initialTenant) {
      setResolved(true);
      return () => {
        cancelled = true;
      };
    }

    resolveTenant();
    return () => {
      cancelled = true;
    };
  }, [initialTenant]);

  if (!resolved) {
    return (
      <main className="container">
        <section className="card">
          <p className="muted">Loading storefront…</p>
        </section>
      </main>
    );
  }

  return tenant ? <TenantLanding tenant={tenant} /> : <SaasHome />;
}
