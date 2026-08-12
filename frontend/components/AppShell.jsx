'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ThemeToggle from './ThemeToggle';
import { Icon } from './ui/LoadlyxUI';
import { CommandPalette } from './ui/InteractiveUI';
import { getStoredUser } from '../lib/auth';

const platformAdminNavigation = [
  ['Platform overview','/admin/platform','chart'],
  ['Revenue & finance','/admin/finance','chart'],
  ['Website & footer','/admin/website','store'],
  ['Plan entitlements','/admin/plans','chart'],
  ['Ledger & withdrawals','/admin/finance#ledger','chart'],
  ['Users','/admin/platform#users','users'],
  ['Tenants','/admin/platform#tenants','store'],
  ['Brokers & carriers','/admin/manage/carriers','users'],
  ['Customers','/admin/customers','users'],
  ['Loads','/admin/manage/loads','route'],
  ['Orders & fulfilment','/admin/manage/orders','store'],
  ['Products','/app/products','store'],
  ['Categories','/admin/manage/categories','store'],
  ['Quotes','/admin/manage/quotes','chart'],
  ['Reviews & disputes','/admin/reputation','check'],
  ['AI management','/admin/ai','spark'],
  ['Simulation controls','/admin/simulation','spark'],
  ['Crypto settings','/admin/crypto','store'],
  ['Themes','/admin/themes','store'],
  ['SEO','/admin/seo','search'],
  ['Platform configuration','/admin/platform#configuration','spark'],
  ['Audit logs','/admin/platform#audit','check'],
  ['Health & integrations','/admin/platform#health','chart'],
  ['Operations map','/admin/map','route']
  ,['Freight OS','/admin/freight-os','route']
  ,['Service partners','/admin/services','check']
  ,['Security controls','/admin/security','lock']
];
const tenantAdminNavigation = [
  ['Overview','/admin/dashboard','chart'],
  ['Customers','/admin/customers','users'],
  ['Quotes','/admin/manage/quotes','chart'],
  ['Orders & fulfilment','/admin/manage/orders','store'],
  ['Products','/app/products','store'],
  ['Categories','/admin/manage/categories','store'],
  ['Loads & fulfilment','/admin/manage/loads','route'],
  ['Financial ledger','/admin/balance#ledger','chart'],
  ['Withdrawals','/admin/balance#withdrawals','chart'],
  ['Payment connections','/admin/payments','chart'],
  ['Store themes','/admin/themes','store'],
  ['SEO tools','/admin/seo','search'],
  ['Tenant experience','/admin/tenant','users']
];
const tenantNavigation = [
  ['Loadlyx Connect','/app/connect','route'],
  ['Loadlyx Intelligence','/app/intelligence','spark'],
  ['Loadlyx Services','/app/services','check'],
  ['Broker TMS','/app/broker-tms','chart'],
  ['Freight loads','/app/connect#loads','chart'],
  ['Truck capacity','/app/connect#trucks','route'],
  ['Freight documents','/app/connect#documents','store'],
  ['Overview','/app/dashboard','chart'],
  ['CRM','/app/crm','users'],
  ['Quotes','/app/quotes','chart'],
  ['Customers','/admin/customers','users'],
  ['Orders & fulfilment','/admin/manage/orders','store'],
  ['Dispatch','/app/dispatch','route'],
  ['Load board','/app/loadboard','search'],
  ['Products','/app/products','store'],
  ['Categories','/admin/manage/categories','store'],
  ['Financial ledger','/admin/balance#ledger','chart'],
  ['Withdrawals','/admin/balance#withdrawals','chart'],
  ['Payment connections','/admin/payments','chart'],
  ['Store themes','/admin/themes','store'],
  ['SEO tools','/admin/seo','search'],
  ['Storefront','/catalog','store']
];
const customerNavigation = [['Loadlyx Connect','/app/connect','route'],['Overview','/app/dashboard','chart'],['My loads','/loads','route'],['Offers','/app/marketplace-offers','spark'],['Agreements & payments','/app/marketplace-transactions','chart'],['Post a load','/quote','spark'],['Marketplace','/loadboard','search'],['Store','/catalog','store']];
const brokerNavigation = [['Loadlyx Connect','/app/connect','route'],['Loadlyx Intelligence','/app/intelligence','spark'],['Loadlyx Services','/app/services','check'],['Broker TMS','/app/broker-tms','chart'],['Overview','/app/dashboard','chart'],['CRM','/app/crm','users'],['Customer loads','/loads','route'],['Offers','/app/marketplace-offers','spark'],['Agreements & payouts','/app/marketplace-transactions','chart'],['Load board','/loadboard','search'],['Provider & payouts','/app/provider-onboarding','check'],['Quotes','/app/quotes','chart'],['Marketplace store','/catalog','store']];
const carrierNavigation = [['Loadlyx Connect','/app/connect','route'],['Loadlyx Intelligence','/app/intelligence','spark'],['Loadlyx Services','/app/services','check'],['Available loads','/loadboard','search'],['My trucks','/app/connect#trucks','route'],['Drivers','/app/connect#drivers','users'],['My loads','/loads','route'],['Offers','/app/marketplace-offers','spark'],['Agreements & payouts','/app/marketplace-transactions','chart'],['Provider & payouts','/app/provider-onboarding','check'],['Dispatch view','/app/dispatch','chart'],['Carrier profile','/carriers/signup','users']];
const driverNavigation = [['Driver Home','/app/driver','route'],['Current load','/app/connect','route'],['My loads','/app/connect#loads','chart'],['Route & tracking','/app/connect#tracking','route'],['Documents','/app/connect#documents','store'],['Messages','/app/connect#messages','users'],['Earnings','/app/marketplace-transactions','chart'],['Fuel','/app/services#fuel','check'],['Support','/resources','users'],['Profile','/app/connect#profile','users']];

export default function AppShell({ mode = 'tenant', children }) {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false); const [role, setRole] = useState(mode === 'admin' ? 'ADMIN' : 'TENANT_ADMIN'); const [paletteOpen, setPaletteOpen] = useState(false); const [paletteQuery, setPaletteQuery] = useState('');
  useEffect(() => { setRole(getStoredUser()?.role || (mode === 'admin' ? 'ADMIN' : 'TENANT_ADMIN')); }, [mode]);
  useEffect(() => { const handler = (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen((value) => !value); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);
  const links = useMemo(() => { if (mode === 'admin') return role === 'TENANT_ADMIN' ? tenantAdminNavigation : platformAdminNavigation; if (role === 'MARKETPLACE_USER') return customerNavigation; if (role === 'BROKER') return brokerNavigation; if (role === 'CARRIER') return carrierNavigation; if (role === 'DRIVER') return driverNavigation; return tenantNavigation; }, [mode, role]);
  const current = links.find(([, href]) => { const route = href.split('#')[0]; return pathname === route || pathname.startsWith(`${route}/`); })?.[0] || 'Workspace';
  const workspaceLabel = mode === 'admin' ? 'Platform administration' : role === 'MARKETPLACE_USER' ? 'Loadlyx Connect customer' : role === 'BROKER' ? 'Loadlyx Connect broker' : role === 'CARRIER' ? 'Loadlyx Connect carrier' : role === 'DRIVER' ? 'Loadlyx Connect driver' : 'Tenant workspace';
  const commandItems = links.map(([label, href, icon]) => ({ label, href, icon, description: `Open ${workspaceLabel.toLowerCase()}` }));

  return <div className={`lx-app-shell ${open ? 'is-open' : ''}`}>
    <aside className="lx-sidebar" aria-label={`${workspaceLabel} navigation`}><a className="lx-sidebar-brand" href={mode === 'admin' ? (role === 'TENANT_ADMIN' ? '/admin/dashboard' : '/admin/platform') : '/app/dashboard'}><span className="brand-mark">{role === 'MARKETPLACE_USER' ? 'F' : 'L'}</span><span><strong>{role === 'MARKETPLACE_USER' ? 'Freight Exchange' : 'Loadlyx'}</strong><small>{role === 'MARKETPLACE_USER' ? 'Powered by Loadlyx' : mode === 'admin' ? 'Platform command' : workspaceLabel}</small></span></a><nav>{links.map(([label, href, icon]) => { const route = href.split('#')[0]; return <a key={href} href={href} onClick={() => setOpen(false)} className={pathname === route || pathname.startsWith(`${route}/`) ? 'active' : ''}><Icon name={icon} /><span>{label}</span></a>; })}</nav>{role === 'MARKETPLACE_USER' ? <div className="lx-locked-nav" aria-label="SaaS features unavailable for loadboard accounts"><span>Business workspace</span>{['CRM & quotes','Dispatch','Store management','Financial ledger'].map((label) => <div key={label}><Icon name="lock" /><span>{label}</span><small>Requires SaaS plan</small></div>)}</div> : null}<div className="lx-sidebar-foot"><div className="lx-system-status"><i />Workspace ready</div><span>{role?.replaceAll('_', ' ')}</span><a href={role === 'MARKETPLACE_USER' ? '/loadboard' : '/'}>View public site</a></div></aside>
    <div className="lx-app-main"><header className="lx-topbar"><button className="lx-menu-button" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation">â˜°</button><div><span className="lx-topbar-kicker">{workspaceLabel}</span><strong>{current}</strong></div><div className="lx-topbar-actions"><button className="lx-command-button" type="button" onClick={() => setPaletteOpen(true)} aria-label="Open workspace search"><Icon name="search" /><span>Search</span><kbd>Ctrl K</kbd></button><Link className="lx-icon-button" href="/resources" aria-label="Open help and resources">?</Link><ThemeToggle /></div></header><div className="lx-app-content">{children}</div></div>
    {open ? <button className="lx-shell-scrim" type="button" aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}
    <CommandPalette open={paletteOpen} query={paletteQuery} onQueryChange={setPaletteQuery} onClose={() => { setPaletteOpen(false); setPaletteQuery(''); }} items={commandItems} />
  </div>;
}

