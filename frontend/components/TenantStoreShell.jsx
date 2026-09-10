import Link from 'next/link';
import StoreCartLink from './StoreCartLink';

function navigationFor(branding = {}) {
  if (branding.businessType === 'MOVING_SUPPLIES') return [
    ['Shop', '/catalog'], ['Moving Boxes', '/catalog?category=Moving%20Boxes'], ['Moving Supplies', '/catalog?category=Moving%20Supplies'], ['Hitch & Bike Racks', '/catalog?category=Bike%20Racks%20%2F%20Hitch%20%26%20Accessories'], ['Vehicle Wiring', '/catalog?category=Vehicle%20Wiring']
  ];
  if (branding.businessType === 'TOTE_RENTAL') return [['Tote Packages', '/catalog'], ['How It Works', '/'], ['FAQ', '/#faq'], ['Contact / Book', '/quote']];
  if (branding.businessType === 'MOVING_SERVICES') return (branding.tenantPages || []).filter((page) => page?.slug && page.showInNav !== false).slice(0, 4).map((page) => [page.navLabel || page.title, `/pages/${page.slug}`]);
  return [['Home', '/'], ['Shop', '/catalog'], ['Get a quote', '/quote']];
}

export default function TenantStoreShell({ tenant, slug, children }) {
  const branding = tenant?.branding || {};
  const tokens = tenant?.theme?.settings?.tokens || {};
  const name = tenant?.name || slug;
  const primary = branding.primaryColor || tokens.primaryColor || '#2563eb';
  const accent = branding.accentColor || tokens.accentColor || '#38bdf8';
  const navigation = navigationFor(branding);
  const isService = branding.businessType === 'MOVING_SERVICES';

  return <main className="tenant-store" style={{ '--store-primary': primary, '--store-accent': accent, '--lx-primary': primary, '--lx-accent': accent }} data-store-theme={tenant?.theme?.key || 'loadlyx-modern'} data-business-type={branding.businessType || 'STORE'}>
    {tenant?.isDemo ? <div className="tenant-announcement">DEMO STOREFRONT — sample products only; real payments are disabled.</div> : branding.promoBannerEnabled && branding.promoBanner ? <div className="tenant-announcement">{branding.promoBanner}</div> : null}
    <header className="tenant-store-header"><div className="tenant-store-header-main">
      <Link href="/" className="tenant-store-brand">{branding.logoUrl ? <img src={branding.logoUrl} alt="" /> : <span>{name.slice(0, 1)}</span>}<strong>{name}</strong></Link>
      <nav>{navigation.map(([label, href]) => <Link key={`${label}-${href}`} href={href}>{label}</Link>)}</nav>
      <div className="tenant-store-actions">{isService && branding.shopMovingSuppliesUrl ? <a href={branding.shopMovingSuppliesUrl}>Shop Moving Supplies</a> : <Link href="/catalog">Search</Link>}{!isService ? <StoreCartLink tenantSlug={slug} /> : <Link className="tenant-cart-link" href="/quote">Get a Quote</Link>}</div>
    </div></header>
    <div className="tenant-store-shell">{children}</div>
    <footer className="tenant-store-footer"><div><Link href="/" className="tenant-store-brand"><span>{name.slice(0, 1)}</span><strong>{name}</strong></Link><p>{branding.footerDescription || 'Commerce and services delivered through a secure Loadlyx tenant experience.'}</p></div><nav><b>{isService ? 'Services' : 'Shop'}</b>{navigation.slice(0,3).map(([label,href])=><Link key={`footer-${label}`} href={href}>{label}</Link>)}</nav><nav><b>Customer care</b>{branding.contactEmail ? <a href={`mailto:${branding.contactEmail}`}>{branding.contactEmail}</a> : null}{branding.contactPhone ? <a href={`tel:${branding.contactPhone}`}>{branding.contactPhone}</a> : null}<span>{branding.serviceArea || branding.contactAddress || 'Local service area'}</span></nav><nav><b>Policies</b><a href="https://www.loadlyx.com/legal/privacy">Privacy</a><a href="https://www.loadlyx.com/legal/terms">Terms</a><a href="https://www.loadlyx.com/legal/payments">Payments</a><small>{tenant?.isDemo ? 'DEMO DATA · NO REAL PAYMENTS' : 'Powered by Loadlyx'}</small></nav></footer>
  </main>;
}