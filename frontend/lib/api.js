import { getTenantHeaders } from './tenant';

const API_URL =
process.env.NEXT_PUBLIC_API_URL ||
'http://localhost:4000/api';

export async function apiFetch(path, options = {}) {
const url = path.startsWith('http')
? path
: `${API_URL}${path}`;

const headers = {
'Content-Type': 'application/json',
...getTenantHeaders(),
...(options.headers || {})
};

const res = await fetch(url, {
...options,
headers
});

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