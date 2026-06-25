'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/categories').then(setCategories).catch((err) => setError(err.message));
  }, []);

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card">
        <h1>Categories</h1>
        <p className="muted">A quick view of product categories and product counts.</p>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <table className="table">
          <thead><tr><th>Name</th><th>Slug</th><th>Description</th><th>Products</th></tr></thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>{category.slug}</td>
                <td>{category.description || '-'}</td>
                <td>{category._count?.products || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
