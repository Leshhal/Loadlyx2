'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

const emptyPage = () => ({ title: '', slug: '', navLabel: '', content: '', heroImageUrl: '', showInNav: true });

const emptyBranding = {
  logoUrl: '',
  heroTitle: '',
  heroSubtitle: '',
  primaryColor: '',
  accentColor: '',
  trustHeadline: '',
  trustCopy: '',
  serviceHeading: '',
  pageImageUrl: '',
  tenantPages: []
};

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function TenantExperiencePage() {
  const [form, setForm] = useState({ id: '', name: '', primaryDomain: '', subdomain: '', branding: emptyBranding });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/admin/tenant-settings')
      .then((data) => setForm({
        id: data.id || '',
        name: data.name || '',
        primaryDomain: data.primaryDomain || '',
        subdomain: data.subdomain || '',
        branding: { ...emptyBranding, ...(data.branding || {}), tenantPages: data.branding?.tenantPages || [] }
      }))
      .catch((err) => setMessage(err.message || 'Failed to load tenant settings'))
      .finally(() => setLoading(false));
  }, []);

  function updateBranding(key, value) {
    setForm((current) => ({ ...current, branding: { ...current.branding, [key]: value } }));
  }

  function updatePage(index, key, value) {
    setForm((current) => {
      const nextPages = [...(current.branding.tenantPages || [])];
      nextPages[index] = { ...nextPages[index], [key]: value };
      return { ...current, branding: { ...current.branding, tenantPages: nextPages } };
    });
  }

  function autoSlug(index, title) {
    setForm((current) => {
      const nextPages = [...(current.branding.tenantPages || [])];
      const currentPage = nextPages[index] || emptyPage();
      nextPages[index] = {
        ...currentPage,
        title,
        slug: currentPage.slug || slugify(title)
      };
      return { ...current, branding: { ...current.branding, tenantPages: nextPages } };
    });
  }

  function addPage() {
    setForm((current) => ({
      ...current,
      branding: {
        ...current.branding,
        tenantPages: [...(current.branding.tenantPages || []), emptyPage()]
      }
    }));
  }

  function removePage(index) {
    setForm((current) => ({
      ...current,
      branding: {
        ...current.branding,
        tenantPages: (current.branding.tenantPages || []).filter((_, pageIndex) => pageIndex !== index)
      }
    }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const cleanedPages = (form.branding.tenantPages || [])
        .map((page) => ({
          ...page,
          title: page.title?.trim() || '',
          slug: slugify(page.slug || page.title || ''),
          navLabel: page.navLabel?.trim() || '',
          content: page.content?.trim() || '',
          heroImageUrl: page.heroImageUrl?.trim() || '',
          showInNav: Boolean(page.showInNav)
        }))
        .filter((page) => page.title && page.slug);

      const payload = {
        name: form.name,
        primaryDomain: form.primaryDomain,
        subdomain: form.subdomain,
        branding: {
          ...form.branding,
          tenantPages: cleanedPages
        }
      };

      const endpoint = form.id ? `/admin/tenant/${form.id}` : '/admin/tenant';
      const method = form.id ? 'PUT' : 'POST';

      const saved = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });

      setForm((current) => ({
        ...current,
        id: saved.id || current.id,
        branding: { ...emptyBranding, ...(saved.branding || current.branding), tenantPages: saved.branding?.tenantPages || cleanedPages }
      }));
      setMessage('Tenant experience updated.');
    } catch (err) {
      setMessage(err.message || 'Failed to save tenant settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card">
        <h1>Tenant Experience</h1>
        <p className="muted">Customize logo, hero copy, trust messaging, page imagery, and custom public pages for your storefront.</p>
      </section>

      <form className="card grid" style={{ gap: 18 }} onSubmit={save}>
        {loading ? <p className="muted">Loading tenant settings...</p> : null}
        {message ? <p className="success">{message}</p> : null}

        <div className="grid grid-2">
          <div className="field"><label>Tenant Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Subdomain</label><input value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value })} placeholder="cansask" /></div>
        </div>

        <div className="field"><label>Primary Domain</label><input value={form.primaryDomain} onChange={(e) => setForm({ ...form, primaryDomain: e.target.value })} placeholder="cansask.loadlyx.com" /></div>

        <div className="grid grid-2">
          <div className="field"><label>Logo URL</label><input value={form.branding.logoUrl} onChange={(e) => updateBranding('logoUrl', e.target.value)} /></div>
          <div className="field"><label>Page Image URL</label><input value={form.branding.pageImageUrl} onChange={(e) => updateBranding('pageImageUrl', e.target.value)} /></div>
        </div>

        <div className="field"><label>Hero Title</label><input value={form.branding.heroTitle} onChange={(e) => updateBranding('heroTitle', e.target.value)} /></div>
        <div className="field"><label>Hero Subtitle</label><textarea value={form.branding.heroSubtitle} onChange={(e) => updateBranding('heroSubtitle', e.target.value)} rows={3} /></div>

        <div className="grid grid-2">
          <div className="field"><label>Trust Headline</label><input value={form.branding.trustHeadline} onChange={(e) => updateBranding('trustHeadline', e.target.value)} /></div>
          <div className="field"><label>Service Heading</label><input value={form.branding.serviceHeading} onChange={(e) => updateBranding('serviceHeading', e.target.value)} /></div>
        </div>

        <div className="field"><label>Trust Copy</label><textarea value={form.branding.trustCopy} onChange={(e) => updateBranding('trustCopy', e.target.value)} rows={3} /></div>

        <div className="grid grid-2">
          <div className="field"><label>Primary Color</label><input value={form.branding.primaryColor} onChange={(e) => updateBranding('primaryColor', e.target.value)} placeholder="#2f6df6" /></div>
          <div className="field"><label>Accent Color</label><input value={form.branding.accentColor} onChange={(e) => updateBranding('accentColor', e.target.value)} placeholder="#f2b843" /></div>
        </div>

        <section className="card" style={{ borderStyle: 'dashed' }}>
          <div className="action-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 style={{ marginBottom: 4 }}>Custom Pages</h2>
              <p className="muted">Create tenant-specific About, Contact, FAQ, service, and other storefront pages.</p>
            </div>
            <button className="btn secondary" type="button" onClick={addPage}>Add Page</button>
          </div>

          {(form.branding.tenantPages || []).length === 0 ? <p className="muted">No custom pages added yet.</p> : null}

          <div className="grid" style={{ gap: 16 }}>
            {(form.branding.tenantPages || []).map((page, index) => (
              <div key={`${page.slug || 'page'}-${index}`} className="card" style={{ background: 'rgba(255,255,255,.03)' }}>
                <div className="action-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <strong>Page {index + 1}</strong>
                  <button type="button" className="btn secondary" onClick={() => removePage(index)}>Remove</button>
                </div>
                <div className="grid grid-3">
                  <div className="field"><label>Title</label><input value={page.title} onChange={(e) => autoSlug(index, e.target.value)} /></div>
                  <div className="field"><label>Slug</label><input value={page.slug} onChange={(e) => updatePage(index, 'slug', slugify(e.target.value))} placeholder="about-us" /></div>
                  <div className="field"><label>Nav Label</label><input value={page.navLabel || ''} onChange={(e) => updatePage(index, 'navLabel', e.target.value)} placeholder="About" /></div>
                </div>
                <div className="field"><label>Hero Image URL</label><input value={page.heroImageUrl || ''} onChange={(e) => updatePage(index, 'heroImageUrl', e.target.value)} /></div>
                <div className="field"><label>Page Content</label><textarea rows={6} value={page.content || ''} onChange={(e) => updatePage(index, 'content', e.target.value)} placeholder="Write the page content here..." /></div>
                <label className="checkbox-row"><input type="checkbox" checked={page.showInNav !== false} onChange={(e) => updatePage(index, 'showInNav', e.target.checked)} /> Show in navigation</label>
              </div>
            ))}
          </div>
        </section>

        <div className="action-row">
          <button className="btn" type="submit" disabled={saving || loading}>{saving ? 'Saving…' : 'Save Tenant Experience'}</button>
        </div>
      </form>
    </main>
  );
}
