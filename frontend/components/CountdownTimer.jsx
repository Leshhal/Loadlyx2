'use client';

import { useEffect, useMemo, useState } from 'react';

function format(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { days, hours, minutes, seconds };
}

export default function CountdownTimer({ endsAt, label = 'Offer ends in' }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setRemaining(new Date(endsAt).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const parts = useMemo(() => format(remaining), [remaining]);
  if (!endsAt || remaining <= 0) return null;

  return (
    <div className="countdown-strip">
      <span className="badge badge-gold">Limited offer</span>
      <span>{label}</span>
      <strong>{parts.days}d {String(parts.hours).padStart(2, '0')}h {String(parts.minutes).padStart(2, '0')}m {String(parts.seconds).padStart(2, '0')}s</strong>
    </div>
  );
}
