import { prisma } from './db';

export interface ScoreDetails {
  environmental: number;
  social: number;
  governance: number;
  total: number;
  carbonTotal: number;
  carbonTarget: number;
  participationsCount: number;
  totalXp: number;
  policyAckRate: number;
  overdueIssues: number;
}

export interface DepartmentScoreReport {
  id: string;
  name: string;
  code: string;
  employeeCount: number;
  headName: string | null;
  scores: ScoreDetails;
}

export interface OverallESGStats {
  environmental: number;
  social: number;
  governance: number;
  overall: number;
  departmentScores: DepartmentScoreReport[];
  weights: {
    environmental: number;
    social: number;
    governance: number;
  };
}

export async function calculateESGStats(): Promise<OverallESGStats> {
  // Fetch global config
  let config = await prisma.appConfig.findUnique({
    where: { id: 'global' },
  });

  if (!config) {
    config = await prisma.appConfig.create({
      data: {
        id: 'global',
        envWeight: 0.4,
        socialWeight: 0.3,
        govWeight: 0.3,
      },
    });
  }

  const envWeight = config.envWeight;
  const socialWeight = config.socialWeight;
  const govWeight = config.govWeight;

  // Fetch policies count
  const policiesCount = await prisma.eSGPolicy.count();

  // Fetch departments with relationships
  const departments = await prisma.department.findMany({
    include: {
      carbonTx: true,
      employees: {
        include: {
          participations: true,
          acknowledgements: true,
        },
      },
      complianceIssues: true,
    },
  });

  const now = new Date();
  const departmentScores: DepartmentScoreReport[] = [];

  for (const dept of departments) {
    // 1. Environmental Score
    const carbonTotal = dept.carbonTx.reduce((sum, tx) => sum + tx.co2eTotal, 0);
    const carbonTarget = dept.carbonTarget || (dept.employeeCount * 2.0); // fallback to calculation if 0
    
    // Formula: Score = 100 - (actual/target) * 50
    // If carbonTotal is 0, score is 100. If carbonTotal equals target, score is 50. Capped at [0, 100].
    let environmental = 100;
    if (carbonTarget > 0) {
      environmental = Math.max(0, Math.min(100, Math.round(100 - (carbonTotal / carbonTarget) * 50)));
    }

    // 2. Social Score
    // approved participations count
    const approvedParts = dept.employees.reduce((count, emp) => {
      const empApproved = emp.participations.filter(p => p.approvalStatus === 'approved').length;
      return count + empApproved;
    }, 0);

    const totalXp = dept.employees.reduce((sum, emp) => sum + emp.xp, 0);

    // Normalization:
    // Participation Rate target = 0.5 per employee
    // XP target = 150 XP per employee
    const targetParts = Math.max(1, dept.employeeCount * 0.5);
    const targetXp = Math.max(1, dept.employeeCount * 150);

    const partScore = Math.min(100, (approvedParts / targetParts) * 100);
    const xpScore = Math.min(100, (totalXp / targetXp) * 100);
    
    // Social score is 50% participation rate score, 50% XP target score
    const social = Math.round((partScore * 0.5) + (xpScore * 0.5));

    // 3. Governance Score
    // Policy acknowledgement rate
    const totalPossibleAcks = dept.employees.length * policiesCount;
    const actualAcks = dept.employees.reduce((sum, emp) => sum + emp.acknowledgements.length, 0);
    const policyAckRate = totalPossibleAcks > 0 ? (actualAcks / totalPossibleAcks) : 1.0;

    // Overdue open compliance issues
    const overdueIssues = dept.complianceIssues.filter(
      issue => issue.status === 'open' && new Date(issue.dueDate) < now
    ).length;

    // Formula: Policy Ack Rate * 100 - (overdue issues count * 20)
    const governance = Math.max(0, Math.min(100, Math.round(policyAckRate * 100 - (overdueIssues * 20))));

    // 4. Department Total Score
    const total = Math.round(
      (environmental * envWeight) +
      (social * socialWeight) +
      (governance * govWeight)
    );

    departmentScores.push({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      employeeCount: dept.employeeCount,
      headName: dept.headName,
      scores: {
        environmental,
        social,
        governance,
        total,
        carbonTotal: parseFloat(carbonTotal.toFixed(2)),
        carbonTarget,
        participationsCount: approvedParts,
        totalXp,
        policyAckRate: parseFloat((policyAckRate * 100).toFixed(1)),
        overdueIssues,
      },
    });
  }

  // Calculate Overall Averages
  const count = departmentScores.length;
  const overallEnv = count > 0 ? departmentScores.reduce((sum, d) => sum + d.scores.environmental, 0) / count : 100;
  const overallSocial = count > 0 ? departmentScores.reduce((sum, d) => sum + d.scores.social, 0) / count : 100;
  const overallGov = count > 0 ? departmentScores.reduce((sum, d) => sum + d.scores.governance, 0) / count : 100;
  const overallTotal = count > 0 ? departmentScores.reduce((sum, d) => sum + d.scores.total, 0) / count : 100;

  return {
    environmental: Math.round(overallEnv),
    social: Math.round(overallSocial),
    governance: Math.round(overallGov),
    overall: Math.round(overallTotal),
    departmentScores,
    weights: {
      environmental: envWeight,
      social: socialWeight,
      governance: govWeight,
    },
  };
}
