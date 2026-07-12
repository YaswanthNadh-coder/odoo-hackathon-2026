import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can create departments.' }, { status: 403 });
    }

    const { name, code, headName, employeeCount, carbonTarget } = await req.json();

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 });
    }

    const dept = await prisma.department.create({
      data: {
        name,
        code: code.toUpperCase(),
        headName: headName || '',
        employeeCount: employeeCount ? parseInt(employeeCount) : 0,
        carbonTarget: carbonTarget !== undefined && carbonTarget !== null ? parseFloat(carbonTarget) : 10.0,
        status: 'active',
      },
    });

    return NextResponse.json(dept);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can update departments.' }, { status: 403 });
    }

    const { id, name, code, headName, employeeCount, carbonTarget, status } = await req.json();

    if (!id || !name || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dept = await prisma.department.update({
      where: { id },
      data: {
        name,
        code: code.toUpperCase(),
        headName: headName || '',
        employeeCount: employeeCount ? parseInt(employeeCount) : 0,
        carbonTarget: carbonTarget !== undefined && carbonTarget !== null ? parseFloat(carbonTarget) : 10.0,
        status: status || 'active',
      },
    });

    return NextResponse.json(dept);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can delete departments.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    // Clean up dependent records to avoid SQLite constraint violations
    await prisma.$transaction([
      prisma.carbonTransaction.deleteMany({ where: { departmentId: id } }),
      prisma.spendingRecord.deleteMany({ where: { departmentId: id } }),
      prisma.complianceIssue.deleteMany({ where: { departmentId: id } }),
      // For employees, we delete their achievements first, then the employees
      prisma.employeeBadge.deleteMany({ where: { employee: { departmentId: id } } }),
      prisma.challengeParticipation.deleteMany({ where: { employee: { departmentId: id } } }),
      prisma.employeeParticipation.deleteMany({ where: { employee: { departmentId: id } } }),
      prisma.policyAcknowledgement.deleteMany({ where: { employee: { departmentId: id } } }),
      prisma.employee.deleteMany({ where: { departmentId: id } }),
      prisma.department.delete( { where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
