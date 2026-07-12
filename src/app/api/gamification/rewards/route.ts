import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can create rewards.' }, { status: 403 });
    }

    const { name, description, pointsRequired, stock } = await req.json();

    if (!name || pointsRequired === undefined || stock === undefined) {
      return NextResponse.json({ error: 'Missing required fields (name, pointsRequired, stock)' }, { status: 400 });
    }

    const reward = await prisma.reward.create({
      data: {
        name,
        description,
        pointsRequired: parseInt(pointsRequired),
        stock: parseInt(stock),
        status: parseInt(stock) > 0 ? 'active' : 'out_of_stock',
      },
    });

    return NextResponse.json(reward);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can update rewards.' }, { status: 403 });
    }

    const { id, name, description, pointsRequired, stock, status } = await req.json();

    if (!id || !name || pointsRequired === undefined || stock === undefined) {
      return NextResponse.json({ error: 'Missing required fields (id, name, pointsRequired, stock)' }, { status: 400 });
    }

    const updated = await prisma.reward.update({
      where: { id },
      data: {
        name,
        description,
        pointsRequired: parseInt(pointsRequired),
        stock: parseInt(stock),
        status: status || (parseInt(stock) > 0 ? 'active' : 'out_of_stock'),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can delete rewards.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 });
    }

    await prisma.reward.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
