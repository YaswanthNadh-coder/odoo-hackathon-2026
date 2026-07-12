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

  // Fetch CSR participations
  const participations = await prisma.employeeParticipation.findMany({
    include: {
      employee: {
        include: { department: true },
      },
      activity: true,
    },
    orderBy: { completedAt: 'desc' },
  });

  // Fetch employees for diversity metrics
  const employees = await prisma.employee.findMany({
    include: { department: true },
  });

  // Fetch training courses
  const courses = await prisma.trainingCourse.findMany({
    orderBy: { title: 'asc' },
  });

  // Fetch training completions
  const trainingCompletions = await prisma.trainingCompletion.findMany({
    include: {
      employee: {
        include: { department: true },
      },
      course: true,
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

  const serializedEmployees = employees.map((emp) => ({
    id: emp.id,
    name: emp.name,
    role: emp.role,
    gender: emp.gender,
    ethnicity: emp.ethnicity,
    department: {
      name: emp.department.name,
      code: emp.department.code,
    },
  }));

  const serializedCourses = courses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    hours: c.hours,
  }));

  const serializedTrainingCompletions = trainingCompletions.map((tc) => ({
    id: tc.id,
    courseId: tc.courseId,
    employeeId: tc.employeeId,
    completedAt: tc.completedAt.toISOString(),
    course: {
      title: tc.course.title,
      hours: tc.course.hours,
    },
    employee: {
      name: tc.employee.name,
      department: {
        name: tc.employee.department.name,
        code: tc.employee.department.code,
      },
    },
  }));

  return (
    <div className="page-fade-in">
      <div className="flex-between mb-8">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>🤝 Social Responsibility Module</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            CSR Activism logging, employee demographics, and training compliance metrics.
          </p>
        </div>
      </div>

      <SocialPortal
        activities={serializedActivities}
        participations={serializedParticipations}
        employees={serializedEmployees}
        courses={serializedCourses}
        trainingCompletions={serializedTrainingCompletions}
        evidenceRequiredEnabled={evidenceRequiredEnabled}
        currentUser={session}
      />
    </div>
  );
}
