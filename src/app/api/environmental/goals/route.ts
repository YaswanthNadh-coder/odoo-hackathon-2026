import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const departmentId = searchParams.get('departmentId');

    const goals = await prisma.environmentalGoal.findMany({
      where: departmentId ? { departmentId } : {},
      include: { department: true },
      orderBy: { targetDate: 'asc' },
    });

    return NextResponse.json(goals);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can manage environmental goals.' }, { status: 403 });
    }

    const { title, description, targetValue, unit, departmentId, targetDate } = await req.json();

    if (!title || targetValue === undefined || !unit || !departmentId || !targetDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const goal = await prisma.environmentalGoal.create({
      data: {
        title,
        description: description || '',
        targetValue: parseFloat(targetValue),
        unit,
        departmentId,
        targetDate: new Date(targetDate),
        status: 'active',
      },
      include: { department: true },
    });

    return NextResponse.json(goal);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can manage environmental goals.' }, { status: 403 });
    }

    const { id, title, description, targetValue, currentValue, unit, departmentId, targetDate, status } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    const goal = await prisma.environmentalGoal.update({
      where: { id },
      data: {
        title,
        description,
        targetValue: targetValue !== undefined ? parseFloat(targetValue) : undefined,
        currentValue: currentValue !== undefined ? parseFloat(currentValue) : undefined,
        unit,
        departmentId,
        targetDate: targetDate ? new Date(targetDate) : undefined,
        status,
      },
      include: { department: true },
    });

    return NextResponse.json(goal);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can delete environmental goals.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    await prisma.environmentalGoal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
