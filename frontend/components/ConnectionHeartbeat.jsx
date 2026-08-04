'use client';

import { useEffect } from 'react';
import { adminFetch } from '@/lib/adminFetch';

export default function ConnectionHeartbeat() {
  useEffect(() => {
    if (!localStorage.getItem('token')) return undefined;
    const send = () => adminFetch('/operations-map/heartbeat', { method: 'POST' }).catch(() => null);
    send();
    const timer = window.setInterval(send, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  return null;
}
