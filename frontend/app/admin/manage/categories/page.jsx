'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api';
import { DataTable, ErrorState, LoadingState, PageHeader, StatusBadge } from '../../../../components/ui/LoadlyxUI';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch('/categories').then(setCategories).catch(err => setError(err.message)).finally(() => setLoading(false)); }, []);
  const columns = [{key:'name',label:'Category',render:row=><strong>{row.name}</strong>},{key:'slug',label:'Slug',render:row=><code>{row.slug}</code>},{key:'description',label:'Description',render:row=>row.description || <span className="muted">Not provided</span>},{key:'products',label:'Products',render:row=><StatusBadge tone={row._count?.products ? 'success' : 'neutral'}>{row._count?.products || 0}</StatusBadge>}];
  return <main className="container"><PageHeader eyebrow="Store structure" title="Product categories" description="Organize the catalog into customer-friendly collections and identify categories that still need inventory." />{error ? <ErrorState message={error} /> : loading ? <LoadingState label="Loading categories" /> : <section className="lx-panel"><div className="lx-panel-header"><div><h2>Catalog organization</h2><p>{categories.length} categories available in this tenant.</p></div></div><DataTable columns={columns} rows={categories} emptyTitle="No categories yet" emptyDescription="Create categories through product management before publishing the storefront." /></section>}</main>;
}
