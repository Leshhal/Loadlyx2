'use client';

import { getTenantSlug } from '@/lib/tenant';
import { useEffect, useState } from 'react';

export default function ProductsPage() {
const [products, setProducts] = useState([]);

useEffect(() => {
const fetchProducts = async () => {
try {
const tenantSlug = getTenantSlug(); 

const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
headers: tenantSlug ? { 'x-tenant-slug': tenantSlug } : {}
});

const data = await res.json();
setProducts(data);
} catch (err) {
console.error('Failed to load products', err);
}
};

fetchProducts();
}, []);

return (
<main style={{ padding: 20 }}>
<h1>Products</h1>

{products.length === 0 ? (
<p>No products found</p>
) : (
products.map((p) => (
<div key={p.id}>
<strong>{p.name}</strong> - ${(p.priceCents / 100).toFixed(2)}
</div>
))
)}
</main>
);
}