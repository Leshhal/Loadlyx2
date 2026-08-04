'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';

export default function StoreThemesPage() {
  const [themes, setThemes] = useState([]);
  const [active, setActive] = useState(null);
  const [message, setMessage] = useState('');
  const [customTheme, setCustomTheme] = useState({ key: '', name: '', description: '', version: '1.0.0', manifest: '{\n  "layout": "classic",\n  "tokens": {\n    "primaryColor": "#2f6df6",\n    "accentColor": "#f2b843",\n    "fontFamily": "system",\n    "buttonRadius": "12px",\n    "pageWidth": "1200px"\n  },\n  "sections": ["hero", "trust", "products", "customPages"]\n}' });

  async function load() {
    try {
      const [themesResponse, activeResponse] = await Promise.all([adminFetch('/themes'), adminFetch('/themes/active')]);
      const themeRows = await themesResponse.json();
      const activeRow = await activeResponse.json();
      if (!themesResponse.ok) throw new Error(themeRows?.error || 'Unable to load themes');
      setThemes(themeRows);
      setActive(activeResponse.ok ? activeRow : null);
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function activate(theme) {
    setMessage('');
    const response = await adminFetch(`/themes/${theme.id}/activate`, { method: 'POST', body: JSON.stringify({ settings: theme.manifestJson }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data?.error || 'Theme activation failed');
    setMessage(`${theme.name} activated.`);
    await load();
  }

  async function rollback() {
    const response = await adminFetch('/themes/rollback', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) return setMessage(data?.error || 'Theme rollback failed');
    setMessage('Previous theme restored.');
    await load();
  }

  async function submitTheme(event) {
    event.preventDefault();
    try {
      const response = await adminFetch('/themes/upload', { method: 'POST', body: JSON.stringify({ ...customTheme, compatibilityVersion: '1', manifest: JSON.parse(customTheme.manifest) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Theme submission failed');
      setMessage(`${data.name} submitted for platform review.`);
    } catch (error) {
      setMessage(error.message || 'Theme submission failed');
    }
  }

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card"><h1>Store Themes</h1><p className="muted">Preview and activate approved, versioned storefront themes. Theme packages use validated manifests and cannot execute server code.</p>{message ? <p className="success">{message}</p> : null}</section>
      {active ? <section className="card row-between"><div><span className="badge">Active</span><h2>{active.theme?.name}</h2><p className="muted">Version {active.theme?.version}</p></div><button className="btn secondary" type="button" disabled={!active.previousTheme} onClick={rollback}>Restore previous theme</button></section> : null}
      <section className="grid grid-3">
        {themes.map((theme) => {
          const tokens = theme.manifestJson?.tokens || {};
          return <article className="card" key={theme.id} style={{ borderTop: `6px solid ${tokens.primaryColor || '#2f6df6'}` }}><span className="badge">{theme.isBuiltIn ? 'Built-in' : 'Approved custom'}</span><h2>{theme.name}</h2><p className="muted">{theme.description}</p><div className="small">Version {theme.version} · Layout {theme.manifestJson?.layout}</div><div className="action-row" style={{ marginTop: 16 }}><button className="btn" type="button" onClick={() => activate(theme)} disabled={active?.themeId === theme.id}>{active?.themeId === theme.id ? 'Active' : 'Activate'}</button></div></article>;
        })}
      </section>
      <form className="card grid" style={{ gap: 14 }} onSubmit={submitTheme}>
        <div><h2>Submit a custom theme manifest</h2><p className="muted">Custom themes are declarative JSON only. Scripts, server code, and arbitrary templates are not executed.</p></div>
        <div className="grid grid-2"><div className="field"><label>Theme key</label><input value={customTheme.key} onChange={(event) => setCustomTheme({ ...customTheme, key: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="my-store-theme" required /></div><div className="field"><label>Name</label><input value={customTheme.name} onChange={(event) => setCustomTheme({ ...customTheme, name: event.target.value })} required /></div></div>
        <div className="field"><label>Description</label><input value={customTheme.description} onChange={(event) => setCustomTheme({ ...customTheme, description: event.target.value })} /></div>
        <div className="field"><label>Validated theme manifest</label><textarea rows={16} value={customTheme.manifest} onChange={(event) => setCustomTheme({ ...customTheme, manifest: event.target.value })} /></div>
        <div><button className="btn" type="submit">Submit for review</button></div>
      </form>
    </main>
  );
}
