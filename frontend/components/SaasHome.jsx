'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon, SectionHeading, StatusBadge } from './ui/LoadlyxUI';
import { homepageDefaults } from '../lib/homepageDefaults';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const problems = [
  ['Leads lose momentum', 'Follow-up falls across inboxes, spreadsheets, and disconnected tools.', 'users'],
  ['Quotes take too long', 'Manual inventory and pricing work delays the moment a customer is ready.', 'alert'],
  ['Dispatch stays reactive', 'Crews, carriers, vehicles, and exceptions compete for attention.', 'route'],
  ['Revenue stays hidden', 'Owners cannot see exactly where opportunity leaks from lead to settlement.', 'chart']
];
const benefits = [
  ['Quote to booked job', 'Move accepted work directly into operations without rebuilding the customer record.'],
  ['AI-assisted next steps', 'Surface pricing, follow-up, carrier, dispatch, and store opportunities for approval.'],
  ['One revenue path', 'Connect subscriptions, marketplace deals, store sales, commissions, and payouts.']
];
const features = [
  ['CRM & quotes', 'Keep demand, conversations, values, and next actions together.', 'users'],
  ['Dispatch intelligence', 'See upcoming work, assignments, conflicts, and load movement.', 'route'],
  ['Marketplace', 'Post, bid, assign, communicate, and track role-aware opportunities.', 'spark'],
  ['Tenant commerce', 'Operate branded stores with supplies, themes, fiat, and crypto-ready checkout.', 'store'],
  ['Revenue intelligence', 'Follow money across subscriptions, commissions, proceeds, and ledger entries.', 'chart'],
  ['AI operations layer', 'Use governed assistants with tenant limits, approved prompts, and usage tracking.', 'spark']
];
const faqs = [
  ['Who is Loadlyx for?', 'Moving companies, brokers, carriers, supply sellers, and general customers use distinct workflows and permissions.'],
  ['Does Loadlyx replace every tool immediately?', 'Loadlyx is designed as a connected operating layer. Teams can adopt the modules that match their current workflow and expand over time.'],
  ['Can each company have its own storefront?', 'Yes. Tenant storefront architecture supports tenant branding, themes, products, orders, and subdomain-based experiences when deployment DNS is configured.'],
  ['How does AI make decisions?', 'AI features are designed to generate recommendations and drafts under role, tenant, usage, and approval controls. High-impact actions should remain reviewable.'],
  ['How does Loadlyx make money?', 'The platform supports three transparent revenue paths: SaaS subscriptions, store commissions, and marketplace commissions.'],
  ['Are marketplace roles separated?', 'Yes. General customers, brokers, carriers, SaaS tenants, support, admin, and super admin have distinct capabilities and protected backend permissions.']
];

function ProductMockup() {
  return <div className="lx-product-mockup" aria-label="Preview of the Loadlyx AI operations dashboard"><div className="lx-mockup-bar"><span /><span /><span /><strong>AI operations workspace</strong><StatusBadge tone="success">Demo preview</StatusBadge></div><div className="lx-mockup-body"><aside><b>L</b>{['Overview','CRM','Quotes','Dispatch','Marketplace','Store'].map((item, i) => <span className={i === 0 ? 'active' : ''} key={item}>{item}</span>)}</aside><section><div className="lx-mockup-title"><div><small>Friday, August 1</small><h3>Good morning, Operations</h3></div><button>Ask Loadlyx AI</button></div><div className="lx-mockup-stats"><div><small>Revenue path</small><strong>$24.8k</strong><em>Demo data</em></div><div><small>Quote conversion</small><strong>38%</strong><em>Demo data</em></div><div><small>Active jobs</small><strong>12</strong><em>Demo data</em></div></div><div className="lx-mockup-grid"><div className="lx-chart-panel"><div className="lx-panel-label"><span>Revenue movement</span><small>Illustrative</small></div><svg viewBox="0 0 420 150" role="img" aria-label="Illustrative revenue trend"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6d8cff" stopOpacity=".4"/><stop offset="1" stopColor="#6d8cff" stopOpacity="0"/></linearGradient></defs><path d="M0 130 C55 118,70 92,115 105 S180 42,225 68 S310 22,420 34 L420 150 L0 150Z" fill="url(#area)"/><path d="M0 130 C55 118,70 92,115 105 S180 42,225 68 S310 22,420 34" fill="none" stroke="#7293ff" strokeWidth="4"/></svg></div><div className="lx-ai-panel"><div className="lx-panel-label"><span>AI recommendations</span><Icon name="spark" /></div>{['Follow up on 3 high-value quotes','Carrier match ready for review','Supply bundle opportunity detected'].map((item, i) => <div className="lx-ai-row" key={item}><span>{i + 1}</span><p>{item}<small>{i === 0 ? 'Sales' : i === 1 ? 'Dispatch' : 'Commerce'}</small></p></div>)}</div></div></section></div></div>;
}

export default function SaasHome() {
  const [published, setPublished] = useState(null);
  const [socialLinks, setSocialLinks] = useState([]);
  useEffect(() => { fetch(`${API_URL}/website/public`).then((response) => response.ok ? response.json() : null).then((data) => { if (data?.homepage) setPublished(data.homepage); if (Array.isArray(data?.socialLinks)) setSocialLinks(data.socialLinks); }).catch(() => null); }, []);
  const sections = published?.sections?.length ? published.sections : homepageDefaults;
  const section = (key) => sections.find((row) => row.key === key) || homepageDefaults.find((row) => row.key === key);
  const display = (key) => ({ display: section(key)?.enabled === false ? 'none' : undefined, order: section(key)?.displayOrder || 0 });
  return <main className="lx-marketing">
    <section className="lx-hero lx-section" style={display('hero')}><div className="lx-hero-copy"><span className="lx-eyebrow"><i />{section('hero').eyebrow}</span><h1>{section('hero').headline}</h1><p>{section('hero').supportingText}</p><div className="lx-hero-actions"><Link className="btn lx-btn-lg" href={section('hero').ctaUrl || '/signup'}>{section('hero').ctaLabel || 'Start free'}</Link><Link className="btn secondary lx-btn-lg" href={section('hero').secondaryCtaUrl || '#how-it-works'}>{section('hero').secondaryCtaLabel || 'See how it works'}</Link></div><div className="lx-trust-row">{['Role-aware portals','Multi-tenant storefronts','Secure payments','AI recommendations'].map(item => <span key={item}><Icon name="check" size={15}/>{item}</span>)}</div></div><ProductMockup /></section>

    <section className="lx-section lx-problem-section" id="problems" style={display('problems')}><SectionHeading eyebrow={section('problems').eyebrow} title={section('problems').headline} description={section('problems').supportingText}/><div className="lx-problem-layout"><div className="lx-problem-column">{problems.slice(0,2).map(([title,body,icon],i)=><article key={title}><span>0{i+1}</span><Icon name={icon}/><h3>{title}</h3><p>{body}</p></article>)}</div><div className="lx-phone"><div className="lx-phone-top"/><div className="lx-phone-screen"><small>Today’s operations</small><strong>Attention queue</strong>{['Quote waiting 2h','Crew conflict at 1:30','3 leads need follow-up','Store order ready'].map((x,i)=><div key={x}><i className={`p${i}`}/><span>{x}</span><b>{i+1}</b></div>)}</div></div><div className="lx-problem-column">{problems.slice(2).map(([title,body,icon],i)=><article key={title}><span>0{i+3}</span><Icon name={icon}/><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>

    <section className="lx-section lx-solution-section" style={display('solution')}><SectionHeading eyebrow={section('solution').eyebrow} title={section('solution').headline} description={section('solution').supportingText}/><div className="lx-solution-visual"><ProductMockup /></div><div className="lx-benefit-grid">{benefits.map(([title,body],i)=><article key={title}><span><Icon name={i===0?'route':i===1?'spark':'chart'}/></span><h3>{title}</h3><p>{body}</p><Link href="/solutions">Explore the workflow →</Link></article>)}</div></section>

    <section className="lx-section lx-proof-section" style={display('social-proof')}><SectionHeading eyebrow={section('social-proof').eyebrow} title={section('social-proof').headline} description={section('social-proof').supportingText}/><div className="lx-role-strip">{[['Moving companies','Leads to completed jobs'],['Brokers','Customer loads to carrier assignment'],['Carriers','Available loads to payout'],['Customers','Post, shop, track, review']].map(([role,outcome])=><article key={role}><div className="lx-avatar">{role[0]}</div><h3>{role}</h3><p>{outcome}</p><StatusBadge tone="success">Role-aware</StatusBadge></article>)}</div></section>

    <section className="lx-section" id="how-it-works" style={display('how-it-works')}><SectionHeading eyebrow={section('how-it-works').eyebrow} title={section('how-it-works').headline} description={section('how-it-works').supportingText}/><div className="lx-step-grid">{[['01','Capture demand','Bring leads, quote requests, customer loads, and store intent into clear intake paths.'],['02','Let AI prepare the work','Generate recommendations, summaries, follow-ups, matches, and next actions for review.'],['03','Operate and improve','Dispatch work, complete transactions, track commissions, and see what needs attention next.']].map(([n,t,b])=><article key={n}><span>{n}</span><div className="lx-step-icon"><Icon name={n==='01'?'users':n==='02'?'spark':'chart'}/></div><h3>{t}</h3><p>{b}</p></article>)}</div></section>

    <section className="lx-section lx-why-section" style={display('why-loadlyx')}><div><span className="lx-eyebrow">{section('why-loadlyx').eyebrow}</span><h2>{section('why-loadlyx').headline}</h2><p>{section('why-loadlyx').supportingText}</p><Link className="btn" href={section('why-loadlyx').ctaUrl || '/solutions'}>{section('why-loadlyx').ctaLabel || 'Explore solutions'}</Link></div><div className="lx-orbit"><div className="lx-orbit-core"><b>L</b><span>Loadlyx</span></div>{['CRM','AI','Dispatch','Store','Market','Finance'].map((x,i)=><span key={x} style={{'--i':i}}>{x}</span>)}</div></section>

    <section className="lx-section lx-compare" style={display('comparison')}><SectionHeading eyebrow={section('comparison').eyebrow} title={section('comparison').headline} description={section('comparison').supportingText}/><div className="lx-compare-table" role="table" aria-label="Loadlyx connected platform comparison"><div role="row"><strong role="columnheader">Decision</strong><b role="columnheader">Loadlyx</b><span role="columnheader">Disconnected tools</span></div>{[['CRM, dispatch, store, and marketplace','Connected','Separate'],['Role-specific customer, broker, and carrier paths','Built in','Manual setup'],['Subscription and commission revenue visibility','Unified ledger path','Reconciled later'],['Tenant storefront and platform operations','One architecture','Multiple systems'],['Governed AI with usage controls','Platform layer','Tool by tool'],['Demo and simulation separation','Explicitly marked','Ad hoc']].map(([d,a,b])=><div role="row" key={d}><strong role="cell">{d}</strong><b role="cell"><Icon name="check" size={16}/>{a}</b><span role="cell">{b}</span></div>)}</div></section>

    <section className="lx-section" style={display('features')}><SectionHeading eyebrow={section('features').eyebrow} title={section('features').headline} description={section('features').supportingText}/><div className="lx-feature-grid">{features.map(([t,b,i])=><article key={t}><span><Icon name={i}/></span><h3>{t}</h3><p>{b}</p></article>)}</div></section>

    <section className="lx-section lx-faq" style={display('faq')}><SectionHeading eyebrow={section('faq').eyebrow} title={section('faq').headline} description={section('faq').supportingText}/><div>{faqs.map(([q,a],i)=><details key={q} open={i===0}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>

    <section className="lx-section lx-final-cta" style={display('final-cta')}><div><span className="lx-eyebrow">{section('final-cta').eyebrow}</span><h2>{section('final-cta').headline}</h2><p>{section('final-cta').supportingText}</p></div><div><Link className="btn lx-btn-lg" href={section('final-cta').ctaUrl || '/signup'}>{section('final-cta').ctaLabel || 'Start free'}</Link><Link className="btn secondary lx-btn-lg" href={section('final-cta').secondaryCtaUrl || '/pricing'}>{section('final-cta').secondaryCtaLabel || 'View pricing'}</Link></div></section>
    <footer className="lx-footer" style={{ order: 10000 }}><div><Link className="nav-brand" href="/"><span className="brand-mark">L</span><span className="brand-copy">Loadlyx</span></Link><p>The AI logistics operating system for connected growth and operations.</p>{socialLinks.length ? <div className="lx-social-links" aria-label="Loadlyx social links">{socialLinks.map((link) => <a key={link.id} href={link.url} target={link.openNewTab ? '_blank' : undefined} rel={link.openNewTab ? 'noopener noreferrer' : undefined} aria-label={`Loadlyx on ${link.displayLabel}`}>{link.displayLabel}</a>)}</div> : null}</div><nav aria-label="Footer navigation"><div><strong>Platform</strong><Link href="/solutions">Solutions</Link><Link href="/pricing">Pricing</Link><Link href="/loadboard">Load board</Link></div><div><strong>Resources</strong><Link href="/resources">Resources</Link><Link href="/quote">Request a quote</Link><Link href="/catalog">Store</Link></div><div><strong>Account</strong><Link href="/login">Sign in</Link><Link href="/signup">Create account</Link><Link href="/forgot-password">Reset password</Link></div></nav></footer>
  </main>;
}
