import type { Metadata } from 'next';
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
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    Organization ESG Control
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
