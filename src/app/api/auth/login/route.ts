import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { setSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const expectedHash = hashPassword(password);
    if (employee.passwordHash !== expectedHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Initialize authenticated cookie session
    const success = await setSession(employee.id);
    if (!success) {
      return NextResponse.json({ error: 'Session creation failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
      },
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
