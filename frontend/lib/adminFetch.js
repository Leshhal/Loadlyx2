import { clearSession, refreshSession } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function adminFetch(path, options = {}) {
const token =
typeof window !== 'undefined' ? localStorage.getItem('token') : null;

const tenantSlug =
typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : null;

const headers = {
'Content-Type': 'application/json',
...(token ? { Authorization: `Bearer ${token}` } : {}),
...(tenantSlug ? { 'x-tenant-slug': tenantSlug } : {}),
...(options.headers || {})
};

let res = await fetch(`${API_URL}${path}`, {
...options,
headers,
credentials: 'include'
});

if (res.status === 401) {
  try {
    const refreshed = await refreshSession();
    headers.Authorization = `Bearer ${refreshed.token}`;
    res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
  } catch {
    clearSession();
  }
}

return res;
}
