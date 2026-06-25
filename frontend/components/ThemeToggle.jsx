'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('loadlyx_theme') : null;
    const initial = saved || 'dark';
    setTheme(initial);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('loadlyx_theme', next);
  }

  return (
    <button className="theme-toggle" onClick={toggleTheme} type="button" aria-label="Toggle color mode">
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
