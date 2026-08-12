'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import { EmptyState, Icon, PageHeader, StatusBadge } from '@/components/ui/LoadlyxUI';

const roleConfig = {
  MARKETPLACE_USER: {
    eyebrow: 'Freight Exchange account',
    title: 'Your loads, offers, and movement in one focused workspace.',
    description: 'Post your own loads and track marketplace activity without access to tenant business operations.',
    primary: ['Open Loadlyx Connect', '/app/connect'], secondary: ['Browse loads', '/loadboard'],
    modules: [['My loads','Review loads connected to your account.','/loads','route'],['Offers','Compare responses and marketplace status.','/app/marketplace-offers','spark'],['Agreements & payments','Follow awarded work and payment status.','/app/marketplace-transactions','chart']]
  },
  BROKER: { eyebrow:'Broker workspace',title:'Keep customer loads and carrier opportunities moving.',description:'See customer demand, marketplace options, and operational handoff.',primary:['Browse load board','/loadboard'],secondary:['Open CRM','/app/crm'],modules:[['Customer pipeline','Review quote demand and follow-up needs.','/app/crm','users'],['Carrier marketplace','Find and compare eligible opportunities.','/loadboard','search'],['Dispatch handoff','Review scheduled and unassigned loads.','/app/dispatch','route']] },
  CARRIER: { eyebrow:'Carrier workspace',title:'Find the right work and prepare every assignment.',description:'Browse eligible loads, route demand, and operating work.',primary:['Available loads','/loadboard'],secondary:['Carrier profile','/carriers/signup'],modules:[['Available work','Search eligible marketplace loads.','/loadboard','search'],['My load activity','Review loads connected to this account.','/loads','route'],['Dispatch view','See timing, status, and assignment readiness.','/app/dispatch','chart']] },
  TENANT_ADMIN: { eyebrow:'Tenant operations',title:'What needs attention next?',description:'Move between demand, quoting, dispatch, marketplace opportunities, and store operations.',primary:['Create quote','/quote'],secondary:['Open CRM','/app/crm'],modules:[['CRM and quotes','Keep demand, value, and follow-up visible.','/app/crm','users'],['Dispatch intelligence','See upcoming and unassigned work.','/app/dispatch','route'],['Store operations','Manage products and tenant commerce.','/app/products','store']] }
};

const lockedSaasModules = [
  ['CRM & quotes','Customer relationship management requires a SaaS business workspace.','users'],
  ['Dispatch operations','Crew, fleet, and dispatch controls require a SaaS plan.','route'],
  ['Store management','Product, order, and storefront administration is tenant-only.','store'],
  ['Financial ledger','Tenant revenue, withdrawals, and payout controls are unavailable.','chart']
];

export default function AppDashboardPage() {
  const [role, setRole] = useState(null);
  useEffect(() => setRole(getStoredUser()?.role || null), []);
  if (!role) return <main className="container"><div className="card">Loading your workspace…</div></main>;
  const config = roleConfig[role] || roleConfig.TENANT_ADMIN;
  const marketplaceOnly = role === 'MARKETPLACE_USER';
  return <main className="container grid lx-dashboard-grid" style={{ gap: 24 }}>
    <PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} actions={<><Link className="btn" href={config.primary[1]}>{config.primary[0]}</Link><Link className="btn secondary" href={config.secondary[1]}>{config.secondary[0]}</Link></>} />
    <section className="lx-attention-panel"><div><StatusBadge tone="success">Account workspace ready</StatusBadge><h2>{marketplaceOnly ? 'Start with your first load' : 'Connect the first live workflow'}</h2><p>{marketplaceOnly ? 'Sign-in is required before the posting form appears. Pricing and offer actions remain protected by account role.' : 'Real activity replaces this onboarding state as work enters the account.'}</p></div><div className="lx-attention-actions">{config.modules.map(([title,body,href,icon]) => <Link href={href} key={title}><Icon name={icon}/><span><strong>{title}</strong><small>{body}</small></span>→</Link>)}</div></section>
    <section className="lx-module-grid">{config.modules.map(([title,body,href,icon]) => <Link className="lx-module-card" href={href} key={title}><span><Icon name={icon}/></span><h3>{title}</h3><p>{body}</p><b>Open module →</b></Link>)}</section>
    {marketplaceOnly ? <section><div className="panel-header"><div><span className="lx-eyebrow">Business workspace</span><h2>Additional Loadlyx tools</h2><p className="muted">These modules are intentionally unavailable to loadboard-only accounts.</p></div><StatusBadge>SAAS PLAN REQUIRED</StatusBadge></div><div className="lx-module-grid lx-locked-modules">{lockedSaasModules.map(([title,body,icon]) => <article className="lx-module-card is-locked" key={title} aria-disabled="true"><span><Icon name={icon}/></span><h3>{title}</h3><p>{body}</p><b><Icon name="lock" size={14}/> Locked</b></article>)}</div></section> : <section className="lx-workspace-panels"><article className="card"><h2>Live performance</h2><EmptyState title="Activity appears here" description="Connected backend records replace this zero-data state." actionHref={config.primary[1]} actionLabel={config.primary[0]}/></article><article className="card"><h2>Recommendation center</h2><p className="muted">AI suggestions appear when permitted data and policies are configured.</p></article></section>}
  </main>;
}
