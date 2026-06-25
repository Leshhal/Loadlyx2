export default function ProductSchemas({ product, siteUrl }) {
  const productUrl = product.canonicalUrl || `${siteUrl}/products/${product.slug}`;
  const primaryImage = product.images?.[0];

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.metaDescription || product.longDescription || product.description,
    sku: product.sku || undefined,
    image: product.images?.length ? product.images.map((image) => image.url) : undefined,
    category: product.category?.name,
    keywords: (product.tags || []).map((tag) => tag.name).join(', '),
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'CAD',
      price: (product.priceCents / 100).toFixed(2),
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    }
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Store',
        item: `${siteUrl}/catalog`
      },
      ...(product.category
        ? [{
            '@type': 'ListItem',
            position: 3,
            name: product.category.name,
            item: `${siteUrl}/catalog?category=${product.category.slug}`
          }]
        : []),
      {
        '@type': 'ListItem',
        position: product.category ? 4 : 3,
        name: product.name,
        item: productUrl
      }
    ]
  };

  const socialImageSchema = primaryImage
    ? {
        '@context': 'https://schema.org',
        '@type': 'ImageObject',
        contentUrl: primaryImage.url,
        description: primaryImage.altText || product.name
      }
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {socialImageSchema ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(socialImageSchema) }} />
      ) : null}
    </>
  );
}
