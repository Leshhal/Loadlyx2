import './globals.css';
import Header from '../components/Header';
import AttributionTracker from '../components/AttributionTracker';
import ConnectionHeartbeat from '../components/ConnectionHeartbeat';
import MarketingFooter from '../components/MarketingFooter';

export const metadata = {
  title: { default: 'Loadlyx', template: '%s | Loadlyx' },
  description: 'Loadlyx connects SaaS operations, tenant storefronts, and Loadlyx Connect freight execution.',
  openGraph: { title: 'Loadlyx', description: 'SaaS operations, storefronts, and the Loadlyx Connect freight network.', type: 'website' }
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
        <MarketingFooter />
      </body>
    </html>
  );
}

