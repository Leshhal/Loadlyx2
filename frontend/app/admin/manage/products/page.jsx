'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api';

export default function ProductsManagementPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [productForm, setProductForm] = useState({
    name: '', slug: '', description: '', longDescription: '', seoTitle: '', metaDescription: '', canonicalUrl: '', imageUrl: '', altText: '', tagsCsv: '',
    priceCents: 0, stock: 0, weightKg: 0, categoryId: '', isFurniture: false, isMovingSupply: true
  });
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '' });

  async function refresh() {
    const [c, p] = await Promise.all([
      apiFetch('/categories'),
      apiFetch('/products')
    ]);
    setCategories(c);
    setProducts(p);
  }

  useEffect(() => { refresh().catch((err) => setMessage(err.message)); }, []);

  async function createCategory(e) {
    e.preventDefault();
    await apiFetch('/categories', { method: 'POST', body: JSON.stringify(categoryForm) });
    setCategoryForm({ name: '', slug: '', description: '' });
    setMessage('Category created');
    refresh();
  }

  async function createProduct(e) {
    e.preventDefault();
    await apiFetch('/products', {
      method: 'POST',
      body: JSON.stringify({
        ...productForm,
        priceCents: Number(productForm.priceCents),
        stock: Number(productForm.stock),
        weightKg: Number(productForm.weightKg),
        categoryId: productForm.categoryId || null,
        tags: productForm.tagsCsv.split(',').map((value) => value.trim()).filter(Boolean)
      })
    });
    setProductForm({ name: '', slug: '', description: '', longDescription: '', seoTitle: '', metaDescription: '', canonicalUrl: '', imageUrl: '', altText: '', tagsCsv: '', priceCents: 0, stock: 0, weightKg: 0, categoryId: '', isFurniture: false, isMovingSupply: true });
    setMessage('Product created');
    refresh();
  }

  async function updateWeight(productId, weightKg) {
    await apiFetch(`/products/${productId}`, { method: 'PUT', body: JSON.stringify({ weightKg: Number(weightKg) }) });
    setMessage('Product weight updated');
    refresh();
  }

  async function deleteProduct(productId, productName) {
    if (!window.confirm(`Delete ${productName}? This cannot be undone.`)) return;
    await apiFetch(`/products/${productId}`, { method: 'DELETE' });
    setMessage('Product deleted');
    refresh();
  }

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section>
        <h1>Product & Category Management</h1>
        <p className="muted">Manage catalog content, shipping weights, SEO fields, tags, and primary image alt text.</p>
        {message ? <p className="success">{message}</p> : null}
      </section>

      <section className="grid grid-2">
        <form className="card" onSubmit={createCategory}>
          <h2>Create Category</h2>
          <div className="field"><label>Name</label><input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} /></div>
          <div className="field"><label>Slug</label><input value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} /></div>
          <div className="field"><label>Description</label><textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} /></div>
          <button className="btn">Save Category</button>
        </form>

        <form className="card" onSubmit={createProduct}>
          <h2>Create Product + SEO</h2>
          <div className="field"><label>Name</label><input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></div>
          <div className="field"><label>Slug</label><input value={productForm.slug} onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })} /></div>
          <div className="field"><label>Short Description</label><textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></div>
          <div className="field"><label>Long Description</label><textarea value={productForm.longDescription} onChange={(e) => setProductForm({ ...productForm, longDescription: e.target.value })} /></div>
          <div className="field"><label>SEO Title</label><input value={productForm.seoTitle} onChange={(e) => setProductForm({ ...productForm, seoTitle: e.target.value })} /></div>
          <div className="field"><label>Meta Description</label><textarea value={productForm.metaDescription} onChange={(e) => setProductForm({ ...productForm, metaDescription: e.target.value })} /></div>
          <div className="field"><label>Canonical URL (optional)</label><input value={productForm.canonicalUrl} onChange={(e) => setProductForm({ ...productForm, canonicalUrl: e.target.value })} /></div>
          <div className="field"><label>Primary Image URL</label><input value={productForm.imageUrl} onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })} /></div>
          <div className="field"><label>Primary Image ALT Text</label><input value={productForm.altText} onChange={(e) => setProductForm({ ...productForm, altText: e.target.value })} /></div>
          <div className="field"><label>Tags (comma separated)</label><input value={productForm.tagsCsv} onChange={(e) => setProductForm({ ...productForm, tagsCsv: e.target.value })} /></div>
          <div className="grid grid-2">
            <div className="field"><label>Price (cents)</label><input type="number" value={productForm.priceCents} onChange={(e) => setProductForm({ ...productForm, priceCents: e.target.value })} /></div>
            <div className="field"><label>Stock</label><input type="number" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} /></div>
            <div className="field"><label>Weight (kg)</label><input type="number" value={productForm.weightKg} onChange={(e) => setProductForm({ ...productForm, weightKg: e.target.value })} /></div>
            <div className="field">
              <label>Category</label>
              <select value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}>
                <option value="">Select category</option>
                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
          </div>
          <button className="btn">Save Product</button>
        </form>
      </section>

      <section className="card">
        <h2>Products Snapshot</h2>
        <table className="table">
          <thead><tr><th>Name</th><th>Tags</th><th>SEO Title</th><th>Primary Image ALT</th><th>Weight (kg)</th><th>Action</th></tr></thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{(product.tags || []).map((tag) => tag.name).join(', ')}</td>
                <td>{product.seoTitle || '-'}</td>
                <td>{product.primaryImage?.altText || '-'}</td>
                <td><input defaultValue={Number(product.weightKg)} id={`weight-${product.id}`} style={{ width: 100 }} /></td>
                <td><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn secondary" onClick={() => updateWeight(product.id, document.getElementById(`weight-${product.id}`).value)}>Update Weight</button><button className="btn ghost" onClick={() => deleteProduct(product.id, product.name)}>Delete</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
