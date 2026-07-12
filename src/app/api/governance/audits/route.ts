import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const audits = await prisma.audit.findMany({
      include: {
        department: true,
        complianceIssues: true,
      },
      orderBy: { auditDate: 'desc' },
    });
    return NextResponse.json(audits);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can manage governance audits.' }, { status: 403 });
    }

    const { title, departmentId, auditorName, auditDate, status, score, findings } = await req.json();

    if (!title || !departmentId || !auditorName || !auditDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const audit = await prisma.audit.create({
      data: {
        title,
        departmentId,
        auditorName,
        auditDate: new Date(auditDate),
        status: status || 'planned',
        score: score !== undefined ? parseInt(score) : null,
        findings: findings || '',
      },
      include: {
        department: true,
        complianceIssues: true,
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
      return NextResponse.json({ error: 'Only Managers and Officers can manage governance audits.' }, { status: 403 });
    }

    const { id, title, departmentId, auditorName, auditDate, status, score, findings } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
    }

    const audit = await prisma.audit.update({
      where: { id },
      data: {
        title,
        departmentId,
        auditorName,
        auditDate: auditDate ? new Date(auditDate) : undefined,
        status,
        score: score !== undefined ? (score === null ? null : parseInt(score)) : undefined,
        findings,
      },
      include: {
        department: true,
        complianceIssues: true,
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
      return NextResponse.json({ error: 'Only Managers and Officers can delete governance audits.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
    }

    // Unlink any associated compliance issues before deleting the audit
    await prisma.$transaction([
      prisma.complianceIssue.updateMany({
        where: { auditId: id },
        data: { auditId: null },
      }),
      prisma.audit.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
