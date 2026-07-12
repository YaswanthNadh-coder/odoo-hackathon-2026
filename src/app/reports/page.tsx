import ReportsPortal from '@/components/ReportsPortal';
import { calculateESGStats } from '@/lib/esg-calc';

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

  return (
    <div className="page-fade-in">
      <div className="flex-between mb-8">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>📁 ESG Summary & Reports Center</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Consolidated audits ledger and exportable regulatory spreadsheets.
          </p>
        </div>
      </div>

      <ReportsPortal
        departmentScores={serializedScores}
        weights={weights}
        overallScores={overallScores}
      />
    </div>
  );
}
