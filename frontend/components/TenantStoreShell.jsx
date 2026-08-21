import Link from 'next/link';
import StoreCartLink from '@/components/StoreCartLink';

export default function TenantStoreShell({ tenant, slug, children }) {
  const branding = tenant?.branding || {};
  const tokens = tenant?.theme?.settings?.tokens || {};
  const name = tenant?.name || slug;
  const primary = branding.primaryColor || tokens.primaryColor || '#175c4c';
  const accent = branding.accentColor || tokens.accentColor || '#e9b949';
  const pages = (branding.tenantPages || []).filter((page) => page?.slug && page.showInNav !== false).slice(0, 2);

  return <main className="tenant-store" style={{ '--store-primary': primary, '--store-accent': accent, '--lx-primary': primary, '--lx-accent': accent }} data-store-theme={tenant?.theme?.key || 'loadlyx-modern'}>
    {tenant?.isDemo ? <div className="tenant-announcement">DEMO STOREFRONT — sample products only; real payments are disabled.</div> : branding.promoBannerEnabled && branding.promoBanner ? <div className="tenant-announcement">{branding.promoBanner}</div> : null}
    <header className="tenant-store-header"><div className="tenant-store-header-main">
      <Link href="/" className="tenant-store-brand">{branding.logoUrl ? <img src={branding.logoUrl} alt="" /> : <span>{name.slice(0, 1)}</span>}<strong>{name}</strong></Link>
      <nav><Link href="/">Home</Link><Link href="/catalog">Shop</Link><Link href="/quote">Get a quote</Link>{pages.map((page) => <Link key={page.slug} href={`/pages/${page.slug}`}>{page.navLabel || page.title}</Link>)}</nav>
      <div className="tenant-store-actions"><Link href="/catalog">Search</Link><StoreCartLink tenantSlug={slug} /></div>
    </div></header>
    <div className="tenant-store-shell">{children}</div>
    <footer className="tenant-store-footer"><div><Link href="/" className="tenant-store-brand"><span>{name.slice(0, 1)}</span><strong>{name}</strong></Link><p>{branding.footerDescription || 'Moving supplies and services, delivered through a secure Loadlyx storefront.'}</p></div><nav><b>Shop</b><Link href="/catalog">All products</Link><Link href="/quote">Request a quote</Link></nav><nav><b>Customer care</b>{branding.contactEmail ? <a href={`mailto:${branding.contactEmail}`}>{branding.contactEmail}</a> : null}{branding.contactPhone ? <a href={`tel:${branding.contactPhone}`}>{branding.contactPhone}</a> : null}<span>{branding.serviceArea || branding.contactAddress || 'Local service area'}</span></nav><nav><b>Policies</b><a href="https://www.loadlyx.com/legal/privacy">Privacy</a><a href="https://www.loadlyx.com/legal/terms">Terms</a><a href="https://www.loadlyx.com/legal/payments">Payments</a><small>{tenant?.isDemo ? 'DEMO DATA · NO REAL PAYMENTS' : 'Powered by Loadlyx'}</small></nav></footer>
  </main>;
}