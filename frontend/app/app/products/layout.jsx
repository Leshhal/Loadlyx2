'use client';

import { useEffect, useState } from 'react';
import { getStoredUser } from '../../../lib/auth';

const PLATFORM_ROLES = new Set(['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT']);

export default function ProductsTenantContextLayout({ children }) {
  const [state, setState] = useState('loading');

  useEffect(() => {
    const role = getStoredUser()?.role;
    const tenantSlug = localStorage.getItem('tenantSlug');
    setState(PLATFORM_ROLES.has(role) && !tenantSlug ? 'select' : 'ready');
  }, []);

  if (state === 'loading') return <div className="lx-loading">Loading product workspace…</div>;
  if (state === 'select') return <section className="lx-panel lx-product-tenant-required">
    <span className="badge">Company context required</span>
    <h1>Select Can-Sask or another tenant</h1>
    <p>Use the <strong>Operating tenant</strong> selector in the left navigation. Product photos, inventory, edits and deletions will then apply only to that company.</p>
  </section>;
  return children;
}
