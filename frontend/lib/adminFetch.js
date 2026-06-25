const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function adminFetch(path, options = {}) {
const token =
typeof window !== 'undefined' ? localStorage.getItem('token') : null;

const tenantSlug =
typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : null;

console.log('ADMIN FETCH TOKEN:', token);
console.log('ADMIN FETCH TENANT:', tenantSlug);
console.log('ADMIN FETCH PATH:', path);

const res = await fetch(`${API_URL}${path}`, {
...options,
headers: {
'Content-Type': 'application/json',
...(token ? { Authorization: `Bearer ${token}` } : {}),
...(tenantSlug ? { 'x-tenant-slug': tenantSlug } : {}),
...(options.headers || {})
}
});

console.log('ADMIN FETCH STATUS:', res.status);

return res;
}