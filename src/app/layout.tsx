import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import UserSwitcher from '@/components/UserSwitcher';
import { getSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'EcoSphere - ESG Management Platform',
  description: 'Track Environmental, Social, and Governance compliance through ERP data integration and employee gamification.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';

  if (!session && pathname !== '/login') {
    redirect('/login');
  }

  return (
    <html lang="en">
      <body>
        {!session ? (
          <main style={{ minHeight: '100vh', width: '100%' }}>
            {children}
          </main>
        ) : (
          <div className="app-container">
            <Sidebar />
            
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <header className="top-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'var(--accent-overall-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    EcoSphere ESG Dashboard
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <UserSwitcher session={session} />
                </div>
              </header>

              <main className="main-content">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
