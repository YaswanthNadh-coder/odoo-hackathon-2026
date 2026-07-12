import { cookies } from 'next/headers';
import prisma from './db';
import { verifyToken, signToken } from './auth';

export interface UserSession {
  employeeId: string;
  name: string;
  role: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
}

export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('ecosphere_session');
    
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    // Verify token cryptographically
    const employeeId = verifyToken(sessionCookie.value);
    if (!employeeId) {
      return null;
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true },
    });

    if (!employee) return null;

    return {
      employeeId: employee.id,
      name: employee.name,
      role: employee.role,
      departmentId: employee.departmentId,
      departmentName: employee.department.name,
      departmentCode: employee.department.code,
    };
  } catch (err: any) {
    // Rethrow Next.js dynamic rendering signals
    if (err && err.digest === 'DYNAMIC_SERVER_USAGE') {
      throw err;
    }
    return null;
  }
}

export async function setSession(employeeId: string): Promise<boolean> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) return false;

    // Sign the token
    const token = signToken(employeeId);

    const cookieStore = await cookies();
    cookieStore.set('ecosphere_session', token, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return true;
  } catch {
    console.error('Session write error:', err);
    return false;
  }
}

export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('ecosphere_session');
  } catch {
    console.error('Session destroy error:', err);
  }
}
