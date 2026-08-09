'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

function countCart(slug) {
  try { return JSON.parse(window.localStorage.getItem(`loadlyx_cart_${slug}`) || '[]').reduce((sum, item) => sum + Number(item.quantity || 0), 0); }
  catch { return 0; }
}

export default function StoreCartLink({ tenantSlug }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(countCart(tenantSlug));
    update();
    window.addEventListener('storage', update);
    window.addEventListener('loadlyx:cart-updated', update);
    return () => { window.removeEventListener('storage', update); window.removeEventListener('loadlyx:cart-updated', update); };
  }, [tenantSlug]);
  return <Link className="tenant-cart-link" href={`/tenant/${tenantSlug}/catalog`} aria-label={`Cart with ${count} items`}>Cart{count ? ` (${count})` : ''}</Link>;
}
