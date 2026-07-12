import GamificationPortal from '@/components/GamificationPortal';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export const revalidate = 0; // Live updates

export default async function GamificationPage() {
  const session = await getSession();

  // Fetch challenges
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

  // Fetch leaderboard of top 10 employees by XP
  const leaderboard = await prisma.employee.findMany({
    include: { department: true },
    orderBy: { xp: 'desc' },
    take: 10,
  });

  // Fetch active employee challenge participations
  let participations: any[] = [];
  let fullUserSession: any = null;
  let redemptions: any[] = [];

  if (session) {
    participations = await prisma.challengeParticipation.findMany({
      where: { employeeId: session.employeeId },
      include: { challenge: true },
    });

    // Fetch active user's actual live database XP/Points
    fullUserSession = await prisma.employee.findUnique({
      where: { id: session.employeeId },
    });

    // Fetch reward redemptions
    redemptions = await prisma.rewardRedemption.findMany({
      where: { employeeId: session.employeeId },
      include: { reward: true },
      orderBy: { redeemedAt: 'desc' },
    });
  }

  // Fetch rewards catalog
  const rewards = await prisma.reward.findMany({
    orderBy: { pointsRequired: 'asc' },
  });

  // Format data for client component serializability
  const serializedChallenges = challenges.map((ch) => ({
    id: ch.id,
    title: ch.title,
    description: ch.description,
    xp: ch.xp,
    difficulty: ch.difficulty,
    status: ch.status,
    evidenceRequired: ch.evidenceRequired,
    deadline: ch.deadline ? ch.deadline.toISOString() : null,
  }));

  const serializedBadges = badges.map((badge) => ({
    id: badge.id,
    name: badge.name,
    description: badge.description,
    unlockRule: badge.unlockRule,
    icon: badge.icon,
    employees: (badge.employees || []).map((eb) => ({
      id: eb.employeeId,
    })),
  }));

  const serializedLeaderboard = leaderboard.map((user) => ({
    id: user.id,
    name: user.name,
    xp: user.xp,
    points: user.points,
    department: {
      name: user.department.name,
      code: user.department.code,
    },
  }));

  const serializedParticipations = participations.map((p) => ({
    id: p.id,
    challengeId: p.challengeId,
    progress: p.progress,
    approval: p.approval,
  }));

  const serializedRewards = rewards.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    pointsRequired: r.pointsRequired,
    stock: r.stock,
    status: r.status,
  }));

  const serializedRedemptions = redemptions.map((red) => ({
    id: red.id,
    rewardId: red.rewardId,
    pointsSpent: red.pointsSpent,
    redeemedAt: red.redeemedAt.toISOString(),
    reward: {
      name: red.reward.name,
    },
  }));

  const clientSession = session ? {
    employeeId: session.employeeId,
    name: session.name,
    role: session.role,
    departmentId: session.departmentId,
    departmentCode: session.departmentCode,
    xp: fullUserSession ? fullUserSession.xp : 0,
    points: fullUserSession ? fullUserSession.points : 0,
  } : null;

  return (
    <div className="page-fade-in">
      <div className="flex-between mb-8">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>🏆 Culture & Gamification Portal</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Accept eco-challenges, track carbon reductions, unlock badges, and redeem points for rewards.
          </p>
        </div>
      </div>

      <GamificationPortal
        challenges={serializedChallenges}
        badges={serializedBadges}
        leaderboard={serializedLeaderboard}
        participations={serializedParticipations}
        rewards={serializedRewards}
        redemptions={serializedRedemptions}
        currentUser={clientSession}
      />
    </div>
  );
}
