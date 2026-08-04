import { getTenantHeaders } from './tenant';
import { clearSession, getStoredSession, refreshSession } from './auth';

const API_URL =
process.env.NEXT_PUBLIC_API_URL ||
'http://localhost:4000/api';

export async function apiFetch(path, options = {}) {
const { retryAuth = true, ...fetchOptions } = options;
const url = path.startsWith('http')
? path
: `${API_URL}${path}`;

const headers = {
'Content-Type': 'application/json',
...getTenantHeaders(),
...(fetchOptions.headers || {})
};
const { token } = getStoredSession();
if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;

let res = await fetch(url, {
...fetchOptions,
headers,
credentials: 'include'
});

if (res.status === 401 && retryAuth && !path.includes('/auth/refresh')) {
  try {
    const refreshed = await refreshSession();
    headers.Authorization = `Bearer ${refreshed.token}`;
    res = await fetch(url, { ...fetchOptions, headers, credentials: 'include' });
  } catch {
    clearSession();
  }
}

const text = await res.text();

let data = null;

try {
data = text ? JSON.parse(text) : null;
} catch {
throw new Error(text || 'Invalid API response');
}

if (!res.ok) {
throw new Error(data?.error || 'API request failed');
}

return data;
}
