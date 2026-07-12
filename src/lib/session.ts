import { cookies } from 'next/headers';
import prisma from './db';

export interface UserSession {
  employeeId: string;
  name: string;
  role: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('ecosphere_session');
  
  let employeeId = sessionCookie?.value;

  // Fallback to the first employee (John Doe) if no session cookie exists
  if (!employeeId) {
    const firstEmp = await prisma.employee.findFirst({
      where: { name: 'John Doe' },
    });
    if (firstEmp) {
      employeeId = firstEmp.id;
    } else {
      return null;
    }
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
}

export async function setSession(employeeId: string): Promise<boolean> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) return false;

  const cookieStore = await cookies();
  cookieStore.set('ecosphere_session', employeeId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
  });

  return true;
}
