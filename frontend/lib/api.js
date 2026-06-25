import { getTenantSlug } from './tenant';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(path, options = {}) {
const token =
typeof window !== 'undefined'
? localStorage.getItem('token')
: null;

const tenantSlug = getTenantSlug();

const res = await fetch(`${API_URL}${path}`, {
...options,
headers: {
'Content-Type': 'application/json',
...(tenantSlug ? { 'x-tenant-slug': tenantSlug } : {}),
...(token ? { Authorization: `Bearer ${token}` } : {}),
...(options.headers || {}),
},
});

if (res.status === 401) {
if (typeof window !== 'undefined') {
localStorage.removeItem('token');
window.location.href = '/login';
}
throw new Error('Unauthorized');
}

const contentType = res.headers.get('content-type') || '';
const isJson = contentType.includes('application/json');

let data;

if (isJson) {
data = await res.json();
} else {
const text = await res.text();
throw new Error(text || 'Non-JSON response returned');
}

if (!res.ok) {
throw new Error(data.error || 'Request failed');
}

return data;
}