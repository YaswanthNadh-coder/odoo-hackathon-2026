import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    
    // Fetch active challenges
    const challenges = await prisma.challenge.findMany({
      orderBy: { deadline: 'asc' },
    });

    // Fetch badges
    const badges = await prisma.badge.findMany({
      include: {
        employees: session ? {
          where: { employeeId: session.employeeId },
        } : false,
      },
    });

    // Leaderboard - Top 10 employees by XP
    const leaderboard = await prisma.employee.findMany({
      include: { department: true },
      orderBy: { xp: 'desc' },
      take: 10,
    });

    // Current employee's challenge participations
    let participations: any[] = [];
    if (session) {
      participations = await prisma.challengeParticipation.findMany({
        where: { employeeId: session.employeeId },
        include: { challenge: true },
      });
    }

    return NextResponse.json({ challenges, badges, leaderboard, participations });
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

    const { challengeId, progress, action, proofUrl } = await req.json();

    if (!challengeId) {
      return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 });
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // 1. Join Challenge Action
    if (action === 'join') {
      const existing = await prisma.challengeParticipation.findFirst({
        where: {
          employeeId: session.employeeId,
          challengeId,
        },
      });

      if (existing) {
        return NextResponse.json({ message: 'Already joined', participation: existing });
      }

      const part = await prisma.challengeParticipation.create({
        data: {
          employeeId: session.employeeId,
          challengeId,
          progress: 0,
          approval: 'pending',
        },
        include: { challenge: true },
      });

      return NextResponse.json({ success: true, participation: part });
    }

    // 2. Update Progress Action
    if (action === 'update-progress') {
      if (progress === undefined || progress < 0 || progress > 100) {
        return NextResponse.json({ error: 'Progress must be between 0 and 100' }, { status: 400 });
      }

      const existing = await prisma.challengeParticipation.findFirst({
        where: {
          employeeId: session.employeeId,
          challengeId,
        },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Not participating in this challenge' }, { status: 404 });
      }

      if (existing.progress === 100) {
        return NextResponse.json({ error: 'Challenge already completed' }, { status: 400 });
      }

      const prevProgress = existing.progress;
      let approvalStatus = 'pending';
      let xpAwarded = 0;
      let awardedBadges: any[] = [];
      let updatedEmployee: any = null;

      // Check config for badge auto-award
      const config = await prisma.appConfig.findUnique({ where: { id: 'global' } });
      const isBadgeAutoAward = config ? config.badgeAutoAward : true;

      if (progress === 100) {
        approvalStatus = 'approved';
        xpAwarded = challenge.xp;

        // 1. Increment employee XP and points
        updatedEmployee = await prisma.employee.update({
          where: { id: session.employeeId },
          data: {
            xp: { increment: challenge.xp },
            points: { increment: challenge.xp }, // double points for completion
          },
        });

        // 2. Auto-award badges if enabled
        if (isBadgeAutoAward) {
          const employeeBadges = await prisma.employeeBadge.findMany({
            where: { employeeId: session.employeeId },
            select: { badgeId: true },
          });
          const employeeBadgeIds = employeeBadges.map(eb => eb.badgeId);

          const lockedBadges = await prisma.badge.findMany({
            where: {
              id: { notIn: employeeBadgeIds },
            },
          });

          // Approved challenge count
          const approvedChallengesCount = await prisma.challengeParticipation.count({
            where: {
              employeeId: session.employeeId,
              progress: 100,
            },
          }) + 1; // including this one!

          for (const badge of lockedBadges) {
            if (!badge.unlockRule) continue;
            try {
              const rule = JSON.parse(badge.unlockRule);
              let meetsRule = false;

              if (rule.xpGte !== undefined && updatedEmployee.xp >= rule.xpGte) {
                meetsRule = true;
              }
              if (rule.challengesCountGte !== undefined && approvedChallengesCount >= rule.challengesCountGte) {
                meetsRule = true;
              }

              if (meetsRule) {
                const eb = await prisma.employeeBadge.create({
                  data: {
                    employeeId: session.employeeId,
                    badgeId: badge.id,
                  },
                  include: { badge: true },
                });
                awardedBadges.push(eb.badge);
              }
            } catch (e) {
              console.error('Error parsing badge rule:', e);
            }
          }
        }
      }

      // Update challenge participation record
      const updatedPart = await prisma.challengeParticipation.update({
        where: { id: existing.id },
        data: {
          progress,
          proofUrl: proofUrl || existing.proofUrl,
          approval: approvalStatus,
          xpAwarded,
        },
        include: { challenge: true },
      });

      return NextResponse.json({
        success: true,
        participation: updatedPart,
        xpAwarded,
        awardedBadges,
        employeeXp: updatedEmployee ? updatedEmployee.xp : undefined,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
