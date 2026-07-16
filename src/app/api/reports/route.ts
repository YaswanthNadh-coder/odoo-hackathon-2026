import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;
    const challengeId = searchParams.get('challengeId') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const moduleType = searchParams.get('module') || 'all'; // all | environmental | social | governance | gamification
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    let dateFilter: any = undefined;
    if (startDateStr || endDateStr) {
      dateFilter = {};
      if (startDateStr) dateFilter.gte = new Date(startDateStr);
      if (endDateStr) dateFilter.lte = new Date(endDateStr);
    }

    // 1. Environmental: Carbon Transactions
    let carbonTransactions: any[] = [];
    if (moduleType === 'all' || moduleType === 'environmental') {
      const whereClause: any = {};
      if (departmentId) whereClause.departmentId = departmentId;
      if (dateFilter) whereClause.date = dateFilter;
      
      carbonTransactions = await prisma.carbonTransaction.findMany({
        where: whereClause,
        include: { department: true, emissionFactor: true },
        orderBy: { date: 'desc' },
      });
    }

    // 2. Social: CSR Participations & Training Completions
    let csrParticipations: any[] = [];
    let trainingCompletions: any[] = [];
    if (moduleType === 'all' || moduleType === 'social') {
      const csrWhere: any = {};
      if (employeeId) csrWhere.employeeId = employeeId;
      if (departmentId) {
        csrWhere.employee = { departmentId };
      }
      if (categoryId) {
        csrWhere.activity = { categoryId };
      }
      if (dateFilter) csrWhere.completedAt = dateFilter;

      csrParticipations = await prisma.employeeParticipation.findMany({
        where: csrWhere,
        include: {
          employee: { include: { department: true } },
          activity: true,
        },
        orderBy: { completedAt: 'desc' },
      });

      const trainingWhere: any = {};
      if (employeeId) trainingWhere.employeeId = employeeId;
      if (departmentId) {
        trainingWhere.employee = { departmentId };
      }
      if (dateFilter) trainingWhere.completedAt = dateFilter;

      trainingCompletions = await prisma.trainingCompletion.findMany({
        where: trainingWhere,
        include: {
          employee: { include: { department: true } },
          course: true,
        },
        orderBy: { completedAt: 'desc' },
      });
    }

    // 3. Governance: Compliance Issues & Audits
    let complianceIssues: any[] = [];
    let audits: any[] = [];
    if (moduleType === 'all' || moduleType === 'governance') {
      const issueWhere: any = {};
      if (departmentId) issueWhere.departmentId = departmentId;
      if (dateFilter) issueWhere.dueDate = dateFilter;

      complianceIssues = await prisma.complianceIssue.findMany({
        where: issueWhere,
        include: { department: true, audit: true },
        orderBy: { dueDate: 'desc' },
      });

      const auditWhere: any = {};
      if (departmentId) auditWhere.departmentId = departmentId;
      if (dateFilter) auditWhere.auditDate = dateFilter;

      audits = await prisma.audit.findMany({
        where: auditWhere,
        include: { department: true },
        orderBy: { auditDate: 'desc' },
      });
    }

    // 4. Gamification: Challenge Participations & Reward Redemptions
    let challengeParticipations: any[] = [];
    let rewardRedemptions: any[] = [];
    if (moduleType === 'all' || moduleType === 'gamification') {
      const challengePartWhere: any = {};
      if (employeeId) challengePartWhere.employeeId = employeeId;
      if (challengeId) challengePartWhere.challengeId = challengeId;
      if (departmentId) {
        challengePartWhere.employee = { departmentId };
      }

      challengeParticipations = await prisma.challengeParticipation.findMany({
        where: challengePartWhere,
        include: {
          employee: { include: { department: true } },
          challenge: true,
        },
        orderBy: { progress: 'desc' },
      });

      const redemptionWhere: any = {};
      if (employeeId) redemptionWhere.employeeId = employeeId;
      if (departmentId) {
        redemptionWhere.employee = { departmentId };
      }
      if (dateFilter) redemptionWhere.redeemedAt = dateFilter;

      rewardRedemptions = await prisma.rewardRedemption.findMany({
        where: redemptionWhere,
        include: {
          employee: { include: { department: true } },
          reward: true,
        },
        orderBy: { redeemedAt: 'desc' },
      });
    }

    return NextResponse.json({
      carbonTransactions,
      csrParticipations,
      trainingCompletions,
      complianceIssues,
      audits,
      challengeParticipations,
      rewardRedemptions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
