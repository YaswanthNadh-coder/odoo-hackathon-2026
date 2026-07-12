import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { trainingId, xpReward } = await req.json();

    if (!trainingId) {
      return NextResponse.json({ error: 'Training ID is required' }, { status: 400 });
    }

    // Award XP/Points to the employee for completing the training
    const updatedEmp = await prisma.employee.update({
      where: { id: session.employeeId },
      data: {
        xp: { increment: xpReward || 30 },
        points: { increment: xpReward || 30 },
      },
    });

    return NextResponse.json({
      success: true,
      trainingId,
      newXp: updatedEmp.xp,
      newPoints: updatedEmp.points,
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
