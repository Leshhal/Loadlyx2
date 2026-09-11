'use client';

import { useState } from 'react';

export default function StoreProductImage({ product, className = 'product-image', priority = false, gallery = false }) {
  const images = (product?.images || []).filter((image) => image?.url);
  const primary = product?.primaryImage?.url ? product.primaryImage : images[0];
  const ordered = primary ? [primary, ...images.filter((image) => image.url !== primary.url)] : [];
  const [selected, setSelected] = useState(0);
  const image = ordered[selected];
  return <div className={className}>
    {image ? <img src={image.url} alt={image.altText || product.name || 'Product'} loading={priority ? 'eager' : 'lazy'} /> : <div className="muted">No image available</div>}
    {gallery && ordered.length > 1 ? <div className="tenant-product-thumbnails" aria-label="Product images">{ordered.map((item, index) => <button type="button" key={item.id || item.url} className={selected === index ? 'active' : ''} onClick={() => setSelected(index)} aria-label={'View image ' + (index + 1)}><img src={item.url} alt="" loading="lazy"/></button>)}</div> : null}
  </div>;
}
