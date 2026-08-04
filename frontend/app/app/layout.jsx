import AppShell from '../../components/AppShell';
import AppGuard from '../../components/AppGuard';
export default function TenantAppLayout({ children }) { return <AppGuard><AppShell mode="tenant">{children}</AppShell></AppGuard>; }
