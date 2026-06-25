'use client';

import { useEffect } from 'react';
import { persistAttributionFromLocation } from '../lib/attribution';

export default function AttributionTracker() {
  useEffect(() => {
    persistAttributionFromLocation();
  }, []);

  return null;
}
