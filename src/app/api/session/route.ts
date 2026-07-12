import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession } from '@/lib/session';
import prisma from '@/lib/db';

export async function GET() {
  const session = await getSession();
  const allEmployees = await prisma.employee.findMany({
    include: { department: true },
  });
  return NextResponse.json({ session, employees: allEmployees });
}

export async function POST(req: NextRequest) {
  const { employeeId } = await req.json();
  const success = await setSession(employeeId);
  if (success) {
    const updatedSession = await getSession();
    return NextResponse.json({ success: true, session: updatedSession });
  }
  return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
}
