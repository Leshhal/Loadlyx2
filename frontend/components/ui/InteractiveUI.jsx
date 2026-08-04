'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { EmptyState, Icon } from './LoadlyxUI';

export function Modal({ open, title, description, onClose, children, footer }) {
  const panelRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const panel = panelRef.current;
    panel?.querySelector('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus();
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
      if (event.key !== 'Tab' || !panel) return;
      const focusable = [...panel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="lx-modal-layer" role="presentation"><button className="lx-modal-backdrop" aria-label="Close dialog" type="button" onClick={onClose} /><section className="lx-modal" role="dialog" aria-modal="true" aria-labelledby="lx-modal-title" ref={panelRef}><header><div><h2 id="lx-modal-title">{title}</h2>{description ? <p>{description}</p> : null}</div><button className="lx-icon-button" type="button" onClick={onClose} aria-label="Close dialog">×</button></header><div className="lx-modal-content">{children}</div>{footer ? <footer>{footer}</footer> : null}</section></div>;
}

export function ConfirmDialog({ open, title = 'Confirm action', description, confirmLabel = 'Confirm', tone = 'primary', busy = false, onConfirm, onClose }) {
  return <Modal open={open} title={title} description={description} onClose={onClose} footer={<><button className="btn ghost" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className={`btn ${tone === 'danger' ? 'danger' : ''}`} type="button" onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button></>}><p className="muted">This action will use the existing Loadlyx workflow and permissions.</p></Modal>;
}

export function Timeline({ items = [], emptyTitle = 'No history available' }) {
  if (!items.length) return <EmptyState title={emptyTitle} description="Recorded status and activity events will appear here." />;
  return <ol className="lx-timeline">{items.map((item, index) => <li key={item.id || index}><span><Icon name={item.icon || 'check'} size={15} /></span><div><strong>{item.title}</strong>{item.description ? <p>{item.description}</p> : null}{item.time ? <time>{item.time}</time> : null}</div></li>)}</ol>;
}

export function CommandPalette({ open, query, onQueryChange, onClose, items = [] }) {
  const visible = items.filter((item) => `${item.label} ${item.description || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <Modal open={open} title="Jump to a workspace" description="Search the destinations available to your current role." onClose={onClose}><label className="field"><span>Search navigation</span><div className="input-with-icon"><Icon name="search" /><input autoFocus value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search pages and actions" /></div></label><div className="lx-command-results">{visible.map((item) => <Link href={item.href} key={`${item.href}-${item.label}`} onClick={onClose}><span><Icon name={item.icon || 'spark'} /></span><div><strong>{item.label}</strong>{item.description ? <small>{item.description}</small> : null}</div><b>→</b></Link>)}{!visible.length ? <EmptyState title="No matching destination" description="Try another page or action name." /> : null}</div></Modal>;
}
