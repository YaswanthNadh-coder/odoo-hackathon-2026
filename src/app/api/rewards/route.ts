import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    const rewards = await prisma.reward.findMany({
      orderBy: { pointsRequired: 'asc' },
    });

    let redemptions: any[] = [];
    let pointsBalance = 0;

    if (session) {
      redemptions = await prisma.rewardRedemption.findMany({
        where: { employeeId: session.employeeId },
        include: { reward: true },
        orderBy: { redeemedAt: 'desc' },
      });

      const emp = await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: { points: true },
      });
      if (emp) {
        pointsBalance = emp.points;
      }
    }

    return NextResponse.json({ rewards, redemptions, pointsBalance });
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

    const body = await req.json();
    const { action } = body;

    // 1. Create Reward Action (Officer / Manager only)
    if (action === 'create-reward') {
      if (session.role !== 'officer' && session.role !== 'manager') {
        return NextResponse.json({ error: 'Only Managers and Officers can add new rewards.' }, { status: 403 });
      }

      const { name, description, pointsRequired, stock } = body;

      if (!name || pointsRequired === undefined || stock === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const reward = await prisma.reward.create({
        data: {
          name,
          description: description || '',
          pointsRequired: parseInt(pointsRequired),
          stock: parseInt(stock),
          status: 'active',
        },
      });

      return NextResponse.json(reward);
    }

    // 2. Redeem Reward Action
    if (action === 'redeem') {
      const { rewardId } = body;
      if (!rewardId) {
        return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 });
      }

      const reward = await prisma.reward.findUnique({
        where: { id: rewardId },
      });

      if (!reward) {
        return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
      }

      if (reward.status !== 'active') {
        return NextResponse.json({ error: 'This reward is currently inactive' }, { status: 400 });
      }

      if (reward.stock <= 0) {
        return NextResponse.json({ error: 'Reward is currently out of stock' }, { status: 400 });
      }

      // Fetch employee points
      const employee = await prisma.employee.findUnique({
        where: { id: session.employeeId },
      });

      if (!employee) {
        return NextResponse.json({ error: 'Employee session not found' }, { status: 404 });
      }

      if (employee.points < reward.pointsRequired) {
        return NextResponse.json({
          error: `Insufficient points. You need ${reward.pointsRequired} points but have ${employee.points}.`,
        }, { status: 400 });
      }

      // Process redemption in a database transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Deduct points from employee
        const updatedEmployee = await tx.employee.update({
          where: { id: session.employeeId },
          data: {
            points: { decrement: reward.pointsRequired },
          },
        });

        // 2. Decrement stock
        const updatedReward = await tx.reward.update({
          where: { id: rewardId },
          data: {
            stock: { decrement: 1 },
          },
        });

        // 3. Create redemption log
        const redemption = await tx.rewardRedemption.create({
          data: {
            rewardId,
            employeeId: session.employeeId,
            pointsSpent: reward.pointsRequired,
          },
          include: { reward: true },
        });

        return { employee: updatedEmployee, reward: updatedReward, redemption };
      });

      return NextResponse.json({
        success: true,
        pointsBalance: result.employee.points,
        redemption: result.redemption,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can manage rewards.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 });
    }

    // Instead of deleting, we flag as inactive if there are redemptions, or delete if clean
    const redemptionsCount = await prisma.rewardRedemption.count({ where: { rewardId: id } });

    if (redemptionsCount > 0) {
      await prisma.reward.update({
        where: { id },
        data: { status: 'inactive' },
      });
      return NextResponse.json({ success: true, message: 'Reward flagged as inactive due to existing redemption history.' });
    } else {
      await prisma.reward.delete({
        where: { id },
      });
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
