import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rewardId } = await req.json();

    if (!rewardId) {
      return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 });
    }

    // Fetch the reward
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    if (reward.stock <= 0) {
      return NextResponse.json({ error: 'Reward is out of stock' }, { status: 400 });
    }

    // Fetch the employee to check points balance
    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    if (employee.points < reward.pointsRequired) {
      return NextResponse.json({
        error: `Insufficient points balance. You need ${reward.pointsRequired} points but have ${employee.points} points.`,
      }, { status: 400 });
    }

    // Deduct points and stock in a database transaction
    const [updatedEmp, updatedReward] = await prisma.$transaction([
      prisma.employee.update({
        where: { id: session.employeeId },
        data: {
          points: { decrement: reward.pointsRequired },
        },
      }),
      prisma.reward.update({
        where: { id: rewardId },
        data: {
          stock: { decrement: 1 },
          status: reward.stock - 1 <= 0 ? 'out_of_stock' : 'active',
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      pointsRemaining: updatedEmp.points,
      rewardName: updatedReward.name,
      newStock: updatedReward.stock,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
