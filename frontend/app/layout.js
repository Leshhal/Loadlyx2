import './globals.css';
import Header from '../components/Header';
import AttributionTracker from '../components/AttributionTracker';
import ConnectionHeartbeat from '../components/ConnectionHeartbeat';

export const metadata = {
  title: 'Loadlyx',
  description: 'Loadlyx logistics platform — marketing site, platform, tenant storefronts, and admin.'
};

const themeBootScript = `(() => {
  try {
    const preference = localStorage.getItem('loadlyx_theme') || 'system';
    const resolved = preference === 'system'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : preference;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.classList.add(resolved);
  } catch (_) { document.documentElement.dataset.theme = 'dark'; document.documentElement.classList.add('dark'); }
})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head>
      <body className="app-body">
        <AttributionTracker />
        <ConnectionHeartbeat />
        <Header />
        <div className="page-shell">{children}</div>
      </body>
    </html>
  );
}
