import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    
    const activities = await prisma.cSRActivity.findMany({
      orderBy: { date: 'desc' },
    });

    const participations = await prisma.employeeParticipation.findMany({
      include: {
        employee: {
          include: { department: true },
        },
        activity: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    return NextResponse.json({ activities, participations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityId, proofUrl } = await req.json();

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Verify setting for evidence requirement
    const config = await prisma.appConfig.findUnique({ where: { id: 'global' } });
    const isEvidenceRequired = config ? config.evidenceRequired : true;

    if (isEvidenceRequired && !proofUrl) {
      return NextResponse.json({ error: 'Evidence is required to submit a CSR participation request.' }, { status: 400 });
    }

    // Create the participation log
    const participation = await prisma.employeeParticipation.create({
      data: {
        employeeId: session.employeeId,
        activityId,
        proofUrl: proofUrl || null,
        approvalStatus: 'pending',
        pointsEarned: 0,
      },
      include: {
        activity: true,
        employee: true,
      },
    });

    return NextResponse.json(participation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
