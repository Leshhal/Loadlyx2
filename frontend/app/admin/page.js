'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminIndexPage() {
const router = useRouter();

useEffect(() => {
const token = localStorage.getItem('token');

if (!token) {
router.replace('/login');
return;
}

router.replace('/admin/dashboard');
}, [router]);

return <div style={{ padding: 20 }}>Loading admin...</div>;
}
