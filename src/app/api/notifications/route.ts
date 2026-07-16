import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: session.employeeId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();

    if (id === 'all') {
      await prisma.notification.updateMany({
        where: { userId: session.employeeId, isRead: false },
        data: { isRead: true },
      });
    } else {
      if (!id || typeof id !== 'string') {
        return NextResponse.json({ error: 'Invalid or missing notification ID' }, { status: 400 });
      }
      // Verify ownership before marking as read
      const notif = await prisma.notification.findUnique({ where: { id } });
      if (notif && notif.userId === session.employeeId) {
        await prisma.notification.update({
          where: { id },
          data: { isRead: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
