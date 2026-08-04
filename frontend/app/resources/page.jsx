import Link from 'next/link';
import { Icon, PageHeader, SectionHeading } from '@/components/ui/LoadlyxUI';

const guides = [
  ['Post a marketplace load', 'Build a clear shipment request, receive eligible offers, and keep commercial terms private until sign-in.', '/loadboard', 'route'],
  ['Launch a tenant storefront', 'Configure tenant branding, contact details, social profiles, products, and public pages.', '/signup', 'store'],
  ['Prepare a moving quote', 'Capture move details in a structured workflow that can connect to supplies and fulfilment.', '/quote', 'chart'],
  ['Understand account paths', 'See how customers, brokers, carriers, tenants, and platform staff use separate workspaces.', '/solutions', 'users']
];

const checklists = [
  ['Marketplace customer', 'Post your own load, compare eligible providers, track progress, and purchase supplies.'],
  ['Broker', 'Manage customer opportunities, compare carrier bids, protect margin, and coordinate communication.'],
  ['Carrier', 'Find eligible loads, submit offers, manage movement status, and build marketplace reputation.'],
  ['SaaS tenant', 'Operate CRM, quotes, dispatch, products, storefront, customers, reporting, and billing.']
];

export default function ResourcesPage() {
  return <main className="lx-marketing-page">
    <section className="lx-marketing-hero lx-resources-hero"><PageHeader eyebrow="Loadlyx resource center" title="Practical guidance for every role in the moving workflow." description="Start with the workflow you need today, then connect marketplace, storefront, operations, and administration as your account grows." actions={<><Link className="btn lx-btn-lg" href="/signup">Create an account</Link><Link className="btn secondary lx-btn-lg" href="/login">Sign in</Link></>} /></section>
    <section className="lx-section"><SectionHeading eyebrow="Getting started" title="Choose the outcome you want to complete." description="Each path opens a real Loadlyx workflow—not a dead documentation placeholder."/><div className="lx-feature-grid">{guides.map(([title, body, href, icon]) => <article key={title}><span><Icon name={icon}/></span><h3>{title}</h3><p>{body}</p><Link href={href}>Open guide →</Link></article>)}</div></section>
    <section className="lx-section lx-resource-split"><div><span className="lx-eyebrow">Account guide</span><h2>Know which workspace belongs to you.</h2><p>Loadlyx keeps customer, provider, tenant, and platform permissions separate so each user sees the tools appropriate to their responsibility.</p><Link className="btn secondary" href="/solutions">Compare solutions</Link></div><div className="grid" style={{ gap: 12 }}>{checklists.map(([title, body]) => <article className="card" key={title}><h3>{title}</h3><p className="muted">{body}</p></article>)}</div></section>
    <section className="lx-section lx-final-cta"><div><span className="lx-eyebrow">Need a starting point?</span><h2>Tell Loadlyx what needs to move.</h2><p>Submit a structured quote request or browse current marketplace opportunities.</p></div><div><Link className="btn lx-btn-lg" href="/quote">Request a quote</Link><Link className="btn secondary lx-btn-lg" href="/loadboard">Browse load board</Link></div></section>
  </main>;
}
