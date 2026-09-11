'use client';

import { useEffect, useState } from 'react';
import { trackStorefrontEvent } from '@/lib/storefrontAnalytics';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';



export default function RecentOrderToast({ tenantSlug }) {
  const [feed, setFeed] = useState(null);
  const [index, setIndex] = useState(-1);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showTimer;
    let hideTimer;
    fetch(API_URL + '/orders/social-proof/recent', { headers: { 'x-tenant-slug': tenantSlug } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.config?.enabled || !data.items?.length) return;
        setFeed(data);
        const shown = Number(sessionStorage.getItem('loadlyx_social_proof_count') || 0);
        if (shown >= data.config.maximumPerSession) return;
        showTimer = window.setTimeout(() => {
          setIndex(shown % data.items.length); setVisible(true);
          sessionStorage.setItem('loadlyx_social_proof_count', String(shown + 1));
          trackStorefrontEvent(tenantSlug, 'social_proof_popup_shown');
          hideTimer = window.setTimeout(() => setVisible(false), data.config.displayDurationSeconds * 1000);
        }, data.config.minimumDelaySeconds * 1000);
      }).catch(() => {});
    return () => { window.clearTimeout(showTimer); window.clearTimeout(hideTimer); };
  }, [tenantSlug]);

  if (!visible || !feed?.items?.[index]) return null;
  const item = feed.items[index];
  const message = [item.region ? 'Someone in ' + item.region : 'A recent customer', item.product ? 'purchased ' + item.product + (item.quantity > 1 ? ' × ' + item.quantity : '') : 'completed a purchase'].join(' ');
  return <aside className="tenant-social-proof" role="status" aria-live="polite" onClick={() => trackStorefrontEvent(tenantSlug, 'social_proof_popup_clicked')}>
    <span aria-hidden="true">✓</span><div><small>Recent verified order</small><strong>{message}</strong></div>
    <button type="button" aria-label="Dismiss recent order notification" onClick={(event) => { event.stopPropagation(); setVisible(false); trackStorefrontEvent(tenantSlug, 'social_proof_dismissed'); }}>×</button>
  </aside>;
}
