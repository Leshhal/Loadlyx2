'use client';

import { useEffect } from 'react';
import { getStoredUser } from '../../lib/auth';

export default function AdminIndexPage() {
useEffect(() => {
const token = localStorage.getItem('token');

if (!token) {
window.location.replace('/login');
return;
}

const role = getStoredUser()?.role;
window.location.replace(role === 'TENANT_ADMIN' ? '/admin/dashboard' : '/admin/platform');
}, []);

return <div style={{ padding: 20 }}>Loading admin...</div>;
}
