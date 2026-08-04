'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function getStoredSession() {
  if (typeof window === 'undefined') return {};
  return {
    token: localStorage.getItem('token') || localStorage.getItem('accessToken'),
    tenantSlug: localStorage.getItem('tenantSlug')
  };
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('loadlyx_user') || 'null'); }
  catch { return null; }
}

export function storeSession(data) {
  if (typeof window === 'undefined') return;
  if (data.token) {
    localStorage.setItem('token', String(data.token).trim());
    localStorage.setItem('accessToken', String(data.token).trim());
  }
  if (data.tenantSlug) localStorage.setItem('tenantSlug', data.tenantSlug);
  if (data.user) localStorage.setItem('loadlyx_user', JSON.stringify(data.user));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('loadlyx_user');
}

export async function authRequest(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
    credentials: 'include'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Authentication request failed');
  return data;
}

export async function refreshSession() {
  const data = await authRequest('/auth/refresh', {});
  storeSession(data);
  return data;
}

export async function logoutSession() {
  const { token } = getStoredSession();
  try {
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: '{}',
        credentials: 'include'
      });
    }
  } finally {
    clearSession();
  }
}
