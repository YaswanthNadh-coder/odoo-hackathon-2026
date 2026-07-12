import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    
    const policies = await prisma.eSGPolicy.findMany({
      include: {
        acknowledgements: session ? {
          where: { employeeId: session.employeeId },
        } : undefined,
      },
    });

    const issues = await prisma.complianceIssue.findMany({
      include: {
        department: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const departments = await prisma.department.findMany();

    return NextResponse.json({ policies, issues, departments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can create policies or issues.' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create-policy') {
      const { title, body: policyBody } = body;
      if (!title) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }

      const policy = await prisma.eSGPolicy.create({
        data: {
          title,
          body: policyBody || '',
        },
      });

      return NextResponse.json({ success: true, policy });
    }

    if (action === 'create-issue') {
      const { departmentId, severity, description, owner, dueDate } = body;
      if (!departmentId || !severity || !description || !owner || !dueDate) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const issue = await prisma.complianceIssue.create({
        data: {
          departmentId,
          severity,
          description,
          owner,
          dueDate: new Date(dueDate),
          status: 'open',
        },
        include: { department: true },
      });

      return NextResponse.json({ success: true, issue });
    }

    if (action === 'resolve-issue') {
      const { issueId } = body;
      if (!issueId) {
        return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
      }

      const issue = await prisma.complianceIssue.update({
        where: { id: issueId },
        data: { status: 'resolved' },
        include: { department: true },
      });

      return NextResponse.json({ success: true, issue });
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
      return NextResponse.json({ error: 'Only Managers and Officers can delete governance items.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and Type (policy/issue) are required' }, { status: 400 });
    }

    if (type === 'policy') {
      await prisma.$transaction([
        prisma.policyAcknowledgement.deleteMany({
          where: { policyId: id },
        }),
        prisma.eSGPolicy.delete({
          where: { id },
        }),
      ]);
      return NextResponse.json({ success: true });
    }

    if (type === 'issue') {
      await prisma.complianceIssue.delete({
        where: { id },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
