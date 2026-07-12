import SocialPortal from '@/components/SocialPortal';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export const revalidate = 0; // Live updates

export default async function SocialPage() {
  const session = await getSession();

  // Fetch activities
  const activities = await prisma.cSRActivity.findMany({
    orderBy: { date: 'desc' },
  });

  // Fetch participations
  const participations = await prisma.employeeParticipation.findMany({
    include: {
      employee: {
        include: { department: true },
      },
      activity: true,
    },
    orderBy: { completedAt: 'desc' },
  });

  // Fetch global config
  const config = await prisma.appConfig.findUnique({
    where: { id: 'global' },
  });

  const evidenceRequiredEnabled = config ? config.evidenceRequired : true;

  // Format data for client component serializability
  const serializedActivities = activities.map((act) => ({
    id: act.id,
    title: act.title,
    description: act.description,
    date: act.date.toISOString(),
  }));

  const serializedParticipations = participations.map((p) => ({
    id: p.id,
    employeeId: p.employeeId,
    activityId: p.activityId,
    approvalStatus: p.approvalStatus,
    proofUrl: p.proofUrl,
    pointsEarned: p.pointsEarned,
    completedAt: p.completedAt ? p.completedAt.toISOString() : null,
    activity: {
      title: p.activity.title,
    },
    employee: {
      name: p.employee.name,
      department: {
        name: p.employee.department.name,
        code: p.employee.department.code,
      },
    },
  }));

  return (
    <div className="page-fade-in">
      <div className="flex-between mb-8">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>🤝 Social Responsibility Module</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            CSR Activism logging, employee participations, and social impact scores.
          </p>
        </div>
      </div>

      <SocialPortal
        activities={serializedActivities}
        participations={serializedParticipations}
        evidenceRequiredEnabled={evidenceRequiredEnabled}
        currentUser={session}
      />
    </div>
  );
}
