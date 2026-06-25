'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api';

export default function SeoToolsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/admin/seo/missing').then(setRows).catch((err) => setError(err.message));
  }, []);

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card">
        <h1>SEO Tools</h1>
        <p className="muted">Phase 1 SEO hygiene report for products missing important search fields.</p>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Products Missing SEO Coverage</h2>
          <Link href="/admin/manage/products" className="btn secondary">Go to product management</Link>
        </div>
        <table className="table">
          <thead><tr><th>Product</th><th>Category</th><th>SEO Title</th><th>Meta Description</th><th>Images</th><th>Missing ALT</th><th>Tags</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.category || '-'}</td>
                <td>{row.seoTitle || 'Missing'}</td>
                <td>{row.metaDescription ? 'Present' : 'Missing'}</td>
                <td>{row.imageCount}</td>
                <td>{row.missingAltCount}</td>
                <td>{row.tags.length ? row.tags.join(', ') : 'Missing'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
