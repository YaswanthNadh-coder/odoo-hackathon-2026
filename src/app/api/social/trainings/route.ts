import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    const courses = await prisma.trainingCourse.findMany({
      orderBy: { title: 'asc' },
    });

    let completions: any[] = [];
    if (session) {
      completions = await prisma.trainingCompletion.findMany({
        where: { employeeId: session.employeeId },
        include: { course: true },
        orderBy: { completedAt: 'desc' },
      });
    }

    return NextResponse.json({ courses, completions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // 1. Create Training Course Action (Officer / Manager only)
    if (action === 'create-course') {
      if (session.role !== 'officer' && session.role !== 'manager') {
        return NextResponse.json({ error: 'Only Managers and Officers can announce training courses.' }, { status: 403 });
      }

      const { title, description, hours } = body;

      if (!title || hours === undefined) {
        return NextResponse.json({ error: 'Title and training hours are required' }, { status: 400 });
      }

      const course = await prisma.trainingCourse.create({
        data: {
          title,
          description: description || '',
          hours: parseFloat(hours),
        },
      });

      return NextResponse.json(course);
    }

    // 2. Complete Training Action
    if (action === 'complete') {
      const { courseId } = body;
      if (!courseId) {
        return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
      }

      // Check if already completed
      const existing = await prisma.trainingCompletion.findFirst({
        where: {
          courseId,
          employeeId: session.employeeId,
        },
      });

      if (existing) {
        return NextResponse.json({ error: 'You have already completed this training course.' }, { status: 400 });
      }

      const course = await prisma.trainingCourse.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      // Record completion and award points/XP
      const result = await prisma.$transaction(async (tx) => {
        const completion = await tx.trainingCompletion.create({
          data: {
            courseId,
            employeeId: session.employeeId,
          },
          include: { course: true },
        });

        // Award 50 points and 50 XP per training completion
        const updatedEmployee = await tx.employee.update({
          where: { id: session.employeeId },
          data: {
            xp: { increment: 50 },
            points: { increment: 50 },
          },
        });

        return { completion, employee: updatedEmployee };
      });

      return NextResponse.json({
        success: true,
        completion: result.completion,
        xp: result.employee.xp,
        points: result.employee.points,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
