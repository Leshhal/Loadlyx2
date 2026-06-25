import './globals.css';
import Header from '../components/Header';
import AttributionTracker from '../components/AttributionTracker';

export const metadata = {
  title: 'Loadlyx',
  description: 'Loadlyx logistics platform — marketing site, platform, tenant storefronts, and admin.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="app-body">
        <AttributionTracker />
        <Header />
        <div className="page-shell">{children}</div>
      </body>
    </html>
  );
}
