import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized. Only officers/managers can create audits.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, departmentId, auditorName, auditDate, status, score, findings } = body;

    if (!title || !auditorName || !departmentId || !auditDate) {
      return NextResponse.json({ error: 'Title, Department, Auditor, and Date are required.' }, { status: 400 });
    }

    const audit = await prisma.audit.create({
      data: {
        title,
        departmentId,
        auditorName,
        auditDate: new Date(auditDate),
        status: status || 'planned',
        score: score !== undefined ? score : null,
        findings,
      },
    });

    return NextResponse.json(audit);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { id, title, departmentId, auditorName, auditDate, status, score, findings } = body;

    if (!id || !title || !auditorName || !departmentId || !auditDate) {
      return NextResponse.json({ error: 'ID, Title, Department, Auditor, and Date are required.' }, { status: 400 });
    }

    const audit = await prisma.audit.update({
      where: { id },
      data: {
        title,
        departmentId,
        auditorName,
        auditDate: new Date(auditDate),
        status,
        score: score !== undefined ? score : null,
        findings,
      },
    });

    return NextResponse.json(audit);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
    }

    await prisma.audit.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
