'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../lib/adminFetch';

const PLATFORM_ROLES = new Set(['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT']);

export default function PlatformTenantSwitcher({ role }) {
  const [tenants, setTenants] = useState([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (!PLATFORM_ROLES.has(role)) return;
    const stored = localStorage.getItem('tenantSlug') || '';
    setSelected(stored);
    adminFetch('/platform-admin/tenants')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load tenants');
        return response.json();
      })
      .then((rows) => {
        const active = (Array.isArray(rows) ? rows : []).filter((tenant) => tenant.isActive !== false);
        setTenants(active);
        if (!stored && active.length === 1) {
          localStorage.setItem('tenantSlug', active[0].slug);
          window.location.reload();
        }
      })
      .catch(() => setTenants([]));
  }, [role]);

  if (!PLATFORM_ROLES.has(role)) return null;

  function changeTenant(event) {
    const slug = event.target.value;
    if (slug) localStorage.setItem('tenantSlug', slug);
    else localStorage.removeItem('tenantSlug');
    setSelected(slug);
    window.location.reload();
  }

  return <label className="lx-tenant-switcher">
    <span>Operating tenant</span>
    <select value={selected} onChange={changeTenant} aria-label="Select company to manage">
      <option value="">Select a company</option>
      {tenants.map((tenant) => <option value={tenant.slug} key={tenant.id}>{tenant.name} ({tenant.slug})</option>)}
    </select>
  </label>;
}
