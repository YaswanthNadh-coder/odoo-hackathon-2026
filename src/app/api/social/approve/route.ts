import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';
import { createNotification } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'manager' && session.role !== 'officer')) {
      return NextResponse.json({ error: 'Only Managers and Officers can approve participation.' }, { status: 403 });
    }

    const { participationId, status } = await req.json();

    if (!participationId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Get participation details
    const part = await prisma.employeeParticipation.findUnique({
      where: { id: participationId },
      include: { employee: true, activity: true },
    });

    if (!part) {
      return NextResponse.json({ error: 'Participation not found' }, { status: 404 });
    }

    if (part.approvalStatus !== 'pending') {
      return NextResponse.json({ error: 'Participation already processed' }, { status: 400 });
    }

    // Settings config
    const config = await prisma.appConfig.findUnique({ where: { id: 'global' } });
    const isEvidenceRequired = config ? config.evidenceRequired : true;
    const isBadgeAutoAward = config ? config.badgeAutoAward : true;

    if (status === 'approved' && isEvidenceRequired && !part.proofUrl) {
      return NextResponse.json({ error: 'Cannot approve participation without evidence.' }, { status: 400 });
    }

    let updatedEmployee = part.employee;
    const awardedBadges: any[] = [];

    if (status === 'approved') {
      const xpToAdd = 50; // award 50 XP
      const pointsToAdd = 20; // award 20 points

      // 1. Update employee stats
      updatedEmployee = await prisma.employee.update({
        where: { id: part.employeeId },
        data: {
          xp: { increment: xpToAdd },
          points: { increment: pointsToAdd },
        },
      });

      // 2. Update participation status
      await prisma.employeeParticipation.update({
        where: { id: participationId },
        data: {
          approvalStatus: 'approved',
          pointsEarned: pointsToAdd,
          completedAt: new Date(),
        },
      });

      // 3. Auto-award badges if enabled
      if (isBadgeAutoAward) {
        // Fetch all badges the employee doesn't have yet
        const employeeBadges = await prisma.employeeBadge.findMany({
          where: { employeeId: part.employeeId },
          select: { badgeId: true },
        });
        const employeeBadgeIds = employeeBadges.map(eb => eb.badgeId);

        const lockedBadges = await prisma.badge.findMany({
          where: {
            id: { notIn: employeeBadgeIds },
          },
        });

        // Get approved counts
        const approvedCount = await prisma.employeeParticipation.count({
          where: {
            employeeId: part.employeeId,
            approvalStatus: 'approved',
          },
        });

        for (const badge of lockedBadges) {
          if (!badge.unlockRule) continue;
          try {
            const rule = JSON.parse(badge.unlockRule);
            let meetsRule = false;

            if (rule.xpGte !== undefined && updatedEmployee.xp >= rule.xpGte) {
              meetsRule = true;
            }
            if (rule.csrCountGte !== undefined && approvedCount >= rule.csrCountGte) {
              meetsRule = true;
            }

            if (meetsRule) {
              const eb = await prisma.employeeBadge.create({
                data: {
                  employeeId: part.employeeId,
                  badgeId: badge.id,
                },
                include: { badge: true },
              });
              awardedBadges.push(eb.badge);
              
              await createNotification(
                part.employeeId,
                '🏆 New Badge Unlocked!',
                `Congratulations! You have unlocked the "${badge.name}" badge.`,
                'badge'
              );
            }
          } catch (e) {
            console.error('Error parsing badge rule:', e);
          }
        }
      }
    } else {
      // Rejected
      await prisma.employeeParticipation.update({
        where: { id: participationId },
        data: {
          approvalStatus: 'rejected',
          pointsEarned: 0,
        },
      });
    }

    if (status === 'approved') {
      await createNotification(
        part.employeeId,
        '✅ CSR Activity Approved',
        `Your participation in "${part.activity.title}" has been approved. You earned 50 XP and 20 Points!`,
        'approval'
      );
    } else {
      await createNotification(
        part.employeeId,
        '❌ CSR Activity Rejected',
        `Your participation in "${part.activity.title}" was not approved.`,
        'approval'
      );
    }

    return NextResponse.json({
      success: true,
      status,
      awardedBadges,
      employeeXp: updatedEmployee.xp,
      employeePoints: updatedEmployee.points,
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
