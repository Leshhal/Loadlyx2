'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

const emptyForm = { id: '', name: '', slug: '', description: '', categoryId: '', imageUrl: '', priceCents: 0, weightKg: 0, stock: 0 };

export default function AppProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([apiFetch('/products'), apiFetch('/categories')]);
      setProducts(p);
      setCategories(c);
    } catch (err) {
      setMessage(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const sorted = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name)), [products]);

  function editProduct(product) {
    setEditing(true);
    setForm({
      id: product.id,
      name: product.name || '',
      slug: product.slug || '',
      description: product.description || '',
      categoryId: product.categoryId || '',
      imageUrl: product.primaryImage?.url || '',
      priceCents: Number(product.priceCents || 0),
      weightKg: Number(product.weightKg || 0),
      stock: Number(product.stock || 0)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      categoryId: form.categoryId || null,
      imageUrl: form.imageUrl,
      altText: form.name,
      priceCents: Number(form.priceCents),
      weightKg: Number(form.weightKg),
      stock: Number(form.stock),
      isMovingSupply: true,
      isFurniture: false
    };
    try {
      if (editing && form.id) {
        await apiFetch(`/products/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setMessage('Product updated');
      } else {
        await apiFetch('/products', { method: 'POST', body: JSON.stringify(payload) });
        setMessage('Product created');
      }
      setForm(emptyForm);
      setEditing(false);
      await loadData();
    } catch (err) {
      setMessage(err.message || 'Failed to save product');
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    try {
      await apiFetch(`/products/${product.id}`, { method: 'DELETE' });
      setMessage('Product deleted');
      if (editing && form.id === product.id) {
        setEditing(false);
        setForm(emptyForm);
      }
      await loadData();
    } catch (err) {
      setMessage(err.message || 'Failed to delete product');
    }
  }

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card">
        <h1>{editing ? 'Edit Product' : 'Add Product'}</h1>
        <p className="muted">Manage products for the platform catalog using the connected API and tenant database.</p>
        {message ? <p className="success">{message}</p> : null}
        <form onSubmit={submit} className="grid grid-2">
          <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="field"><label>Slug</label><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></div>
          <div className="field"><label>Price (cents)</label><input type="number" value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value })} required /></div>
          <div className="field"><label>Weight (kg)</label><input type="number" step="0.01" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} required /></div>
          <div className="field"><label>Stock</label><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></div>
          <div className="field"><label>Category</label><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Select</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="field" style={{ gridColumn: '1 / -1' }}><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="field" style={{ gridColumn: '1 / -1' }}><label>Image URL</label><input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
          <div className="action-row" style={{ gridColumn: '1 / -1' }}>
            <button className="btn" type="submit">{editing ? 'Save Changes' : 'Add Product'}</button>
            {editing ? <button className="btn secondary" type="button" onClick={() => { setEditing(false); setForm(emptyForm); }}>Cancel</button> : null}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="row-between"><h2>Products</h2><span className="badge">{sorted.length} items</span></div>
        {loading ? <p className="muted">Loading products...</p> : (
          <table className="table">
            <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Weight</th><th>Image</th><th>Actions</th></tr></thead>
            <tbody>
              {sorted.map((product) => (
                <tr key={product.id}>
                  <td><strong>{product.name}</strong><div className="muted small">{product.description || '-'}</div></td>
                  <td>{product.category?.name || '-'}</td>
                  <td>${(Number(product.priceCents || 0) / 100).toFixed(2)}</td>
                  <td>{Number(product.weightKg || 0).toFixed(2)} kg</td>
                  <td>{product.primaryImage?.url ? <img src={product.primaryImage.url} alt={product.name} style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 10 }} /> : '-'}</td>
                  <td><div className="action-row"><button className="btn secondary" type="button" onClick={() => editProduct(product)}>Edit</button><button className="btn ghost" type="button" onClick={() => removeProduct(product)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
