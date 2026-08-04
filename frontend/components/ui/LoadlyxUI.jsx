import Link from 'next/link';

const paths = {
  spark: 'M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2zm7 13 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z',
  route: 'M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.5 15.5h3a3 3 0 0 0 3-3 3 3 0 0 1 3-3',
  chart: 'M4 19V9m5 10V5m5 14v-7m5 7V3',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.87m-1-12a4 4 0 0 1 0 7.75',
  store: 'M3 9l2-5h14l2 5M5 13v8h14v-8M9 21v-6h6v6M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0',
  check: 'M20 6 9 17l-5-5', alert: 'M12 9v4m0 4h.01M10.3 3.7 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0z',
  search: 'm21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3m-11 0h12v10H6V11zm6 4v2'
};
export function Icon({ name = 'spark', size = 20 }) { return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.spark} /></svg>; }
export function PageHeader({ eyebrow, title, description, actions }) { return <section className="lx-page-header"><div><span className="lx-eyebrow">{eyebrow}</span><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{actions ? <div className="lx-header-actions">{actions}</div> : null}</section>; }
export function StatCard({ label, value, detail, tone = 'blue', icon = 'chart' }) { return <article className={`lx-stat lx-tone-${tone}`}><div className="lx-stat-icon"><Icon name={icon} /></div><div className="lx-stat-label">{label}</div><strong>{value}</strong>{detail ? <span>{detail}</span> : null}</article>; }
export function StatusBadge({ children, tone = 'neutral' }) { return <span className={`lx-status lx-status-${tone}`}><i />{children}</span>; }
export function EmptyState({ title, description, actionHref, actionLabel }) { return <div className="lx-empty"><span className="lx-empty-icon"><Icon name="search" size={24} /></span><h3>{title}</h3><p>{description}</p>{actionHref ? <Link className="btn" href={actionHref}>{actionLabel}</Link> : null}</div>; }
export function SectionHeading({ eyebrow, title, description, align = 'center' }) { return <div className={`lx-section-heading lx-align-${align}`}><span className="lx-eyebrow">{eyebrow}</span><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>; }

export function LoadingState({ label = 'Loading workspace data' }) {
  return <div className="lx-loading" role="status" aria-live="polite"><span className="lx-spinner" aria-hidden="true" /><span>{label}</span></div>;
}

export function ErrorState({ title = 'Unable to load this view', message, onRetry }) {
  return <div className="lx-error-state" role="alert"><span className="lx-error-icon"><Icon name="alert" /></span><div><h3>{title}</h3><p>{message || 'Check the connection and try again.'}</p>{onRetry ? <button className="btn secondary" type="button" onClick={onRetry}>Try again</button> : null}</div></div>;
}

export function FilterBar({ children, resultLabel, actions }) {
  return <section className="lx-filter-bar" aria-label="Filters"><div className="lx-filter-fields">{children}</div>{resultLabel ? <span className="lx-filter-result">{resultLabel}</span> : null}{actions ? <div className="lx-filter-actions">{actions}</div> : null}</section>;
}

export function FormSection({ title, description, children, actions }) {
  return <fieldset className="lx-form-section"><legend>{title}</legend>{description ? <p>{description}</p> : null}<div className="lx-form-section-body">{children}</div>{actions ? <div className="lx-form-section-actions">{actions}</div> : null}</fieldset>;
}

export function DataTable({ columns, rows, rowKey = 'id', emptyTitle = 'No records found', emptyDescription = 'New records will appear here.' }) {
  if (!rows?.length) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return <div className="lx-table-wrap"><table className="lx-data-table"><thead><tr>{columns.map(column => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row[rowKey] ?? index}>{columns.map(column => <td key={column.key} data-label={column.label}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody></table></div>;
}

export function ActivityFeed({ items = [], empty = 'No recent activity' }) {
  if (!items.length) return <EmptyState title={empty} description="Activity will appear as work moves through the platform." />;
  return <ol className="lx-activity-feed">{items.map((item, index) => <li key={item.id || index}><span className={`lx-activity-dot lx-tone-${item.tone || 'blue'}`} /><div><strong>{item.title}</strong>{item.description ? <p>{item.description}</p> : null}{item.time ? <time>{item.time}</time> : null}</div></li>)}</ol>;
}

export function Drawer({ open, title, description, onClose, children, footer }) {
  if (!open) return null;
  return <div className="lx-drawer-layer" role="presentation"><button className="lx-drawer-backdrop" type="button" aria-label="Close panel" onClick={onClose} /><aside className="lx-drawer" role="dialog" aria-modal="true" aria-labelledby="lx-drawer-title"><header><div><h2 id="lx-drawer-title">{title}</h2>{description ? <p>{description}</p> : null}</div><button className="lx-icon-button" type="button" onClick={onClose} aria-label="Close panel">×</button></header><div className="lx-drawer-content">{children}</div>{footer ? <footer>{footer}</footer> : null}</aside></div>;
}
