import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import UserSwitcher from '@/components/UserSwitcher';
import { getSession } from '@/lib/session';
import prisma from '@/lib/db';

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

  // Fetch all employees for the global switcher
  const employees = await prisma.employee.findMany({
    include: { department: true },
    orderBy: { name: 'asc' },
  });

  return (
    <html lang="en">
      <body>
        <div className="app-container">
          <Sidebar session={session} />
          
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <header className="top-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Organization ESG Control
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <UserSwitcher 
                  currentEmployeeId={session?.employeeId || ''} 
                  employees={employees} 
                />
              </div>
            </header>

            <main className="main-content">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
