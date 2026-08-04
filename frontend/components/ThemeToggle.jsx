'use client';

import { useEffect, useState } from 'react';

function applyTheme(preference) {
  const resolved = preference === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : preference;
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(resolved);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState('system');
  useEffect(() => {
    const initial = localStorage.getItem('loadlyx_theme') || 'system'; setTheme(initial); applyTheme(initial);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if ((localStorage.getItem('loadlyx_theme') || 'system') === 'system') applyTheme('system'); };
    media.addEventListener('change', onChange); return () => media.removeEventListener('change', onChange);
  }, []);
  function cycleTheme() { const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'; setTheme(next); localStorage.setItem('loadlyx_theme', next); applyTheme(next); }
  const symbol = theme === 'dark' ? '●' : theme === 'light' ? '○' : '◐';
  return <button className="theme-toggle" onClick={cycleTheme} type="button" aria-label={`Color mode: ${theme}. Activate to change.`} title="Change color mode"><span aria-hidden="true">{symbol}</span><span>{theme[0].toUpperCase() + theme.slice(1)}</span></button>;
}
