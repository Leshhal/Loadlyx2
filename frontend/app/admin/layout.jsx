'use client';

import AdminGuard from '../../components/AdminGuard';
import AppShell from '../../components/AppShell';

export default function AdminLayout({ children }) {
  return <AdminGuard><AppShell mode="admin">{children}</AppShell></AdminGuard>;
}
