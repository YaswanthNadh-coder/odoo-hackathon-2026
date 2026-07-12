import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { policyId } = await req.json();

    if (!policyId) {
      return NextResponse.json({ error: 'Policy ID is required' }, { status: 400 });
    }

    // Check if already acknowledged
    const existing = await prisma.policyAcknowledgement.findFirst({
      where: {
        employeeId: session.employeeId,
        policyId,
      },
    });

    if (existing) {
      return NextResponse.json({ message: 'Already acknowledged' });
    }

    const ack = await prisma.policyAcknowledgement.create({
      data: {
        employeeId: session.employeeId,
        policyId,
      },
    });

    return NextResponse.json({ success: true, acknowledgement: ack });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
