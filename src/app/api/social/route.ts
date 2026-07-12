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
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create-activity') {
      if (session.role !== 'officer' && session.role !== 'manager') {
        return NextResponse.json({ error: 'Only Managers and Officers can create activities.' }, { status: 403 });
      }

      const { title, description, categoryId, date } = body;
      if (!title) {
        return NextResponse.json({ error: 'Activity Title is required' }, { status: 400 });
      }

      const activity = await prisma.cSRActivity.create({
        data: {
          title,
          description: description || '',
          categoryId: categoryId || null,
          date: date ? new Date(date) : new Date(),
        },
      });

      return NextResponse.json(activity);
    }

    if (action === 'request-approval') {
      const { participationId, proofUrl } = body;
      
      if (!participationId) {
        return NextResponse.json({ error: 'Participation ID is required' }, { status: 400 });
      }

      const config = await prisma.appConfig.findUnique({ where: { id: 'global' } });
      const isEvidenceRequired = config ? config.evidenceRequired : true;

      if (isEvidenceRequired && !proofUrl) {
        return NextResponse.json({ error: 'Evidence is required to submit a CSR participation request.' }, { status: 400 });
      }

      const updated = await prisma.employeeParticipation.update({
        where: { id: participationId },
        data: {
          proofUrl: proofUrl || null,
          approvalStatus: 'pending',
        },
        include: {
          activity: true,
          employee: true,
        },
      });

      return NextResponse.json(updated);
    }

    // Default: Join / Register participation
    const { activityId } = body;

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Create the participation log as "joined"
    const participation = await prisma.employeeParticipation.create({
      data: {
        employeeId: session.employeeId,
        activityId,
        approvalStatus: 'joined',
        pointsEarned: 0,
      },
      include: {
        activity: true,
        employee: true,
      },
    });

    return NextResponse.json(participation);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can delete CSR activities.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Clean up dependent participations first
    await prisma.$transaction([
      prisma.employeeParticipation.deleteMany({
        where: { activityId: id },
      }),
      prisma.cSRActivity.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can update CSR activities.' }, { status: 403 });
    }

    const { id, title, description, date } = await req.json();

    if (!id || !title) {
      return NextResponse.json({ error: 'Missing required fields (id, title)' }, { status: 400 });
    }

    const updated = await prisma.cSRActivity.update({
      where: { id },
      data: {
        title,
        description,
        date: date ? new Date(date) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
