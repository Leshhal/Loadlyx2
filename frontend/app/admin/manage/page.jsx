import Link from 'next/link';

const cards = [
  { href: '/admin/manage/products', title: 'Products', description: 'Create products, set weights, SEO titles, alt text, and tags.' },
  { href: '/admin/manage/categories', title: 'Categories', description: 'Organize products into moving supplies and furniture collections.' },
  { href: '/admin/manage/quotes', title: 'Quotes', description: 'Review quote submissions, routes, comments, and parsed data.' },
  { href: '/admin/manage/loads', title: 'Loads', description: 'See pending loads and public-feed ready jobs created from quotes.' },
  { href: '/admin/manage/orders', title: 'Orders', description: 'Review store orders, totals, attribution, and order items.' },
  { href: '/admin/manage/carriers', title: 'Carrier Profiles', description: 'Review mover signups captured from the public load feed and carrier interest form.' },
  { href: '/admin/tenant', title: 'Tenant Experience', description: 'Customize logos, colors, page imagery, banners, trust messaging, and shipping threshold copy.' },
  { href: '/admin/seo', title: 'SEO Tools', description: 'Find products missing SEO fields, tags, or image alt text.' }
];

export default function ManageHomePage() {
  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card">
        <h1>Management Console</h1>
        <p className="muted">Dedicated admin workspace for catalog, logistics operations, public load feed, and carrier maintenance.</p>
      </section>

      <section className="grid grid-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="card quick-link">
            <strong>{card.title}</strong>
            <p className="muted">{card.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
