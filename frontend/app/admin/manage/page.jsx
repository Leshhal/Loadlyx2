import Link from 'next/link';
import { Icon, PageHeader } from '../../../components/ui/LoadlyxUI';

const cards = [
  { href: '/admin/manage/products', title: 'Products', description: 'Create listings, manage inventory, images, pricing, SEO, and shipping data.', icon: 'store' },
  { href: '/admin/manage/categories', title: 'Categories', description: 'Organize products into clear storefront collections.', icon: 'store' },
  { href: '/admin/manage/quotes', title: 'Quotes', description: 'Review customer demand, routes, source attribution, and status.', icon: 'chart' },
  { href: '/admin/manage/loads', title: 'Loads', description: 'Monitor pending, posted, assigned, and completed marketplace work.', icon: 'route' },
  { href: '/admin/manage/orders', title: 'Orders', description: 'Track purchases, payments, attribution, and fulfilment.', icon: 'chart' },
  { href: '/admin/manage/carriers', title: 'Carrier profiles', description: 'Review onboarding, fleet information, service areas, and approval state.', icon: 'users' },
  { href: '/admin/tenant', title: 'Tenant experience', description: 'Configure branding, storefront content, trust messaging, and conversion tools.', icon: 'users' },
  { href: '/admin/seo', title: 'SEO coverage', description: 'Find products missing search metadata, tags, imagery, or ALT text.', icon: 'search' }
];

export default function ManageHomePage(){return <main className="container"><PageHeader eyebrow="Operational control" title="Management console" description="Move directly into the catalog, customer demand, fulfilment, and tenant-experience areas that require administration."/><section className="lx-manage-grid">{cards.map(card=><Link key={card.href} href={card.href} className="lx-manage-card"><span><Icon name={card.icon}/></span><div><strong>{card.title}</strong><p>{card.description}</p></div><b aria-hidden="true">→</b></Link>)}</section></main>}
