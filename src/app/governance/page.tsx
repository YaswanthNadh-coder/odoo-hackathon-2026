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
      } : undefined,
    },
  });

  // Fetch compliance issues
  const issues = await prisma.complianceIssue.findMany({
    include: {
      department: true,
      audit: true,
    },
    orderBy: { dueDate: 'asc' },
  });

  // Fetch departments for dropdown
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
  });

  // Fetch audits
  const audits = await prisma.audit.findMany({
    include: {
      department: true,
      complianceIssues: true,
    },
    orderBy: { auditDate: 'desc' },
  });

  // Serialize dates for client components
  const serializedIssues = issues.map((issue) => ({
    id: issue.id,
    severity: issue.severity,
    description: issue.description,
    owner: issue.owner,
    dueDate: issue.dueDate.toISOString(),
    status: issue.status,
    auditId: issue.auditId,
    audit: issue.audit ? {
      title: issue.audit.title,
    } : null,
    department: {
      name: issue.department.name,
      code: issue.department.code,
    },
  }));

  const serializedPolicies = policies.map((policy) => ({
    id: policy.id,
    title: policy.title,
    body: policy.body,
    acknowledgements: policy.acknowledgements?.map((ack) => ({
      id: ack.id,
    })) ?? [],
  }));

  const serializedDepartments = departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    code: dept.code,
  }));

  const serializedAudits = audits.map((audit) => ({
    id: audit.id,
    title: audit.title,
    departmentId: audit.departmentId,
    auditorName: audit.auditorName,
    auditDate: audit.auditDate.toISOString(),
    status: audit.status,
    score: audit.score,
    findings: audit.findings,
    department: {
      name: audit.department.name,
      code: audit.department.code,
    },
    complianceIssues: audit.complianceIssues.map((issue) => ({
      id: issue.id,
      description: issue.description,
      status: issue.status,
    })),
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
        audits={serializedAudits}
        currentUser={session}
      />
    </div>
  );
}
