import ReportsPortal from '@/components/ReportsPortal';
import { calculateESGStats } from '@/lib/esg-calc';
import prisma from '@/lib/db';

export const revalidate = 0; // Live updates

export default async function ReportsPage() {
  const stats = await calculateESGStats();

  const overallScores = {
    environmental: stats.environmental,
    social: stats.social,
    governance: stats.governance,
    overall: stats.overall,
  };

  const weights = {
    environmental: stats.weights.environmental,
    social: stats.weights.social,
    governance: stats.weights.governance,
  };

  const serializedScores = stats.departmentScores.map((dept) => ({
    id: dept.id,
    name: dept.name,
    code: dept.code,
    employeeCount: dept.employeeCount,
    headName: dept.headName,
    scores: {
      environmental: dept.scores.environmental,
      social: dept.scores.social,
      governance: dept.scores.governance,
      total: dept.scores.total,
      carbonTotal: dept.scores.carbonTotal,
      carbonTarget: dept.scores.carbonTarget,
      participationsCount: dept.scores.participationsCount,
      totalXp: dept.scores.totalXp,
      policyAckRate: dept.scores.policyAckRate,
      overdueIssues: dept.scores.overdueIssues,
    },
  }));

  // Fetch filter options
  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  const employees = await prisma.employee.findMany({ orderBy: { name: 'asc' } });
  const challenges = await prisma.challenge.findMany({ orderBy: { title: 'asc' } });
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  const serializedDepartments = departments.map(d => ({ id: d.id, name: d.name, code: d.code }));
  const serializedEmployees = employees.map(e => ({ id: e.id, name: e.name }));
  const serializedChallenges = challenges.map(c => ({ id: c.id, title: c.title }));
  const serializedCategories = categories.map(cat => ({ id: cat.id, name: cat.name, type: cat.type }));

  return (
    <div className="page-fade-in">
      <div className="flex-between mb-8">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>📁 ESG Summary & Reports Center</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Consolidated audits ledger, pre-configured vertical indexes, and custom exportable reports builder.
          </p>
        </div>
      </div>

      <ReportsPortal
        departmentScores={serializedScores}
        weights={weights}
        overallScores={overallScores}
        departments={serializedDepartments}
        employees={serializedEmployees}
        challenges={serializedChallenges}
        categories={serializedCategories}
      />
    </div>
  );
}
