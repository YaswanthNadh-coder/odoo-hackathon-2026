import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import ProfilePortal from '@/components/ProfilePortal';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: {
      id: true,
      name: true,
      email: true,
      gender: true,
      ethnicity: true,
      department: {
        select: { name: true }
      }
    }
  });

  if (!employee) {
    redirect('/login');
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>My Profile</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your personal information and diversity metrics.</p>
      </div>

      <ProfilePortal employee={employee} />
    </div>
  );
}
