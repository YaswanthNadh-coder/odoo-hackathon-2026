import GovernancePortal from '@/components/GovernancePortal';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export const revalidate = 0; // Live updates

export default async function GovernancePage() {
  const session = await getSession();

  // Fetch policies with acknowledgements for active user
  const policies = await prisma.eSGPolicy.findMany({
    include: {
      acknowledgements: session ? {
        where: { employeeId: session.employeeId },
      } : false,
    },
  });

  // Fetch compliance issues
  const issues = await prisma.complianceIssue.findMany({
    include: {
      department: true,
    },
    orderBy: { dueDate: 'asc' },
  });

  // Fetch departments for dropdown
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
  });

  // Serialize dates for client components
  const serializedIssues = issues.map((issue) => ({
    id: issue.id,
    severity: issue.severity,
    description: issue.description,
    owner: issue.owner,
    dueDate: issue.dueDate.toISOString(),
    status: issue.status,
    department: {
      name: issue.department.name,
      code: issue.department.code,
    },
  }));

  const serializedPolicies = policies.map((policy) => ({
    id: policy.id,
    title: policy.title,
    body: policy.body,
    acknowledgements: policy.acknowledgements.map((ack) => ({
      id: ack.id,
    })),
  }));

  const serializedDepartments = departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    code: dept.code,
  }));

  return (
    <div className="page-fade-in">
      <div className="flex-between mb-8">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>⚖️ Governance & Compliance Module</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Corporate ESG policy sign-offs, compliance audits, and overdue resolution penalties.
          </p>
        </div>
      </div>

      <GovernancePortal
        policies={serializedPolicies}
        issues={serializedIssues}
        departments={serializedDepartments}
        currentUser={session}
      />
    </div>
  );
}
