'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  xp: number;
  difficulty: string;
  status: string;
  deadline: string | null;
}

interface Badge {
  id: string;
  name: string;
  description: string | null;
  unlockRule: string;
  icon: string | null;
  employees: {
    id: string;
  }[]; // indicates if unlocked by active user
}

interface LeaderboardUser {
  id: string;
  name: string;
  xp: number;
  points: number;
  department: {
    name: string;
    code: string;
  };
}

interface Participation {
  id: string;
  challengeId: string;
  progress: number;
  approval: string;
}

interface GamificationPortalProps {
  challenges: Challenge[];
  badges: Badge[];
  leaderboard: LeaderboardUser[];
  participations: Participation[];
  currentUser: {
    employeeId: string;
    name: string;
    role: string;
    departmentId: string;
    departmentCode: string;
    xp: number;
    points: number;
  } | null;
}

export default function GamificationPortal({
  challenges,
  badges,
  leaderboard,
  participations,
  currentUser,
}: GamificationPortalProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [progressValues, setProgressValues] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newBadges, setNewBadges] = useState<any[]>([]);

  // Find user's active XP/Points dynamically from leaderboard if available
  const dbUser = leaderboard.find(u => u.id === currentUser?.employeeId);
  const activeXp = dbUser ? dbUser.xp : (currentUser?.xp || 0);
  const activePoints = dbUser ? dbUser.points : (currentUser?.points || 0);

  // Handle joining a challenge
  const handleJoinChallenge = async (challengeId: string) => {
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, action: 'join' }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Joined challenge! Start recording your progress.');
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to join challenge.');
      }
    } catch (err) {
      setErrorMessage('Unexpected error joining challenge.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle updating challenge progress
  const handleUpdateProgress = async (challengeId: string) => {
    const progressVal = progressValues[challengeId];
    if (progressVal === undefined || progressVal < 0 || progressVal > 100) {
      setErrorMessage('Please enter a valid progress percentage (0 - 100).');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setNewBadges([]);

    try {
      const res = await fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          progress: progressVal,
          action: 'update-progress',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (progressVal === 100) {
          setSuccessMessage(`Challenge COMPLETED! Awarded +${data.xpAwarded} XP!`);
          if (data.awardedBadges && data.awardedBadges.length > 0) {
            setNewBadges(data.awardedBadges);
          }
        } else {
          setSuccessMessage('Challenge progress updated successfully.');
        }
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to update progress.');
      }
    } catch (err) {
      setErrorMessage('Unexpected error updating progress.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Messages */}
      {errorMessage && (
        <div className="pill pill-error" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', textTransform: 'none', justifyContent: 'flex-start' }}>
          ⚠️ {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="pill pill-success" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', textTransform: 'none', justifyContent: 'flex-start', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
          <span>✅ {successMessage}</span>
          {newBadges.map((badge, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              🎉 Badge Unlocked: {badge.icon} {badge.name} - {badge.description}
            </div>
          ))}
        </div>
      )}

      {/* Row 1: Employee Score / Progress card + Leaderboard */}
      <div className="grid-cols-3">
        {/* User Stats Card */}
        <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.25rem', borderLeft: '4px solid var(--accent-overall)' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem' }}>Active Employee Progress Profile</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Logged in as <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser?.name}</span> ({currentUser?.departmentCode})
            </p>
          </div>

          <div className="grid-cols-2" style={{ gap: '1.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Experience Points (XP)</span>
              <h2 style={{ fontSize: '2rem', color: 'var(--accent-overall)', margin: '0.25rem 0' }}>⭐ {activeXp} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>XP</span></h2>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginTop: '0.5rem' }}>
                <div style={{ width: `${Math.min(100, (activeXp / 500) * 100)}%`, height: '100%', background: 'var(--accent-overall-gradient)', borderRadius: '4px' }} />
              </div>
              <div className="flex-between" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                <span>Level Progress</span>
                <span>{activeXp} / 500 XP</span>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Redeemable Balance Points</span>
              <h2 style={{ fontSize: '2rem', color: 'var(--accent-gov)', margin: '0.25rem 0' }}>⚡ {activePoints} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Points</span></h2>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                Use points in reward catalog programs.
              </p>
            </div>
          </div>
        </div>

        {/* Leaderboard Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '240px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>🏆 Top CSR Leaders</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', flexGrow: 1 }}>
            {leaderboard.map((user, idx) => {
              const isActiveUser = user.id === currentUser?.employeeId;
              return (
                <div
                  key={user.id}
                  className="flex-between"
                  style={{
                    padding: '0.4rem 0.6rem',
                    background: isActiveUser ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                    border: isActiveUser ? '1px solid rgba(6, 182, 212, 0.2)' : 'none',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? '#cd7f32' : 'var(--text-muted)', width: '16px' }}>
                      {idx + 1}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.department.code}</span>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-overall)' }}>
                    {user.xp} XP
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Challenges Checklist */}
      <div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>🌱 Active Eco-Action Challenges</h3>
        <div className="grid-cols-3">
          {challenges.map((ch) => {
            const userPart = participations.find((p) => p.challengeId === ch.id);
            const isJoined = !!userPart;
            const isCompleted = userPart?.progress === 100;

            let diffColor = 'pill-info';
            if (ch.difficulty === 'hard') diffColor = 'pill-error';
            else if (ch.difficulty === 'medium') diffColor = 'pill-warning';

            return (
              <div
                key={ch.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '240px',
                  border: isCompleted ? '1.5px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-glow)',
                }}
              >
                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                  <span className={`pill ${diffColor}`} style={{ fontSize: '0.6rem' }}>
                    {ch.difficulty.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-overall)' }}>
                    ⭐ +{ch.xp} XP
                  </span>
                </div>

                <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{ch.title}</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.4rem', flexGrow: 1, lineHeight: '1.4' }}>
                  {ch.description}
                </p>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Status & Controls */}
                  {isJoined ? (
                    <div>
                      {isCompleted ? (
                        <div className="pill pill-success" style={{ width: '100%', justifyContent: 'center', fontSize: '0.7rem' }}>
                          ✓ Completed & Awarded
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {/* Progress slider input */}
                          <div className="flex-between">
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Progress:</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                              {userPart.progress}%
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                              min="0"
                              max="100"
                              placeholder="0"
                              value={progressValues[ch.id] !== undefined ? progressValues[ch.id] : userPart.progress}
                              onChange={(e) =>
                                setProgressValues({
                                  ...progressValues,
                                  [ch.id]: parseInt(e.target.value) || 0,
                                })
                              }
                            />
                            <button
                              className="btn btn-env"
                              style={{ flexGrow: 1, padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                              onClick={() => handleUpdateProgress(ch.id)}
                              disabled={submitting}
                            >
                              Update Progress
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '0.5rem' }}
                      onClick={() => handleJoinChallenge(ch.id)}
                      disabled={submitting}
                    >
                      🚀 Accept Challenge
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 3: Badges Achievements Showcase */}
      <div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>🏆 Sustainability Badges & Achievements</h3>
        <div className="grid-cols-3">
          {badges.map((badge) => {
            const isUnlocked = badge.employees && badge.employees.length > 0;
            return (
              <div
                key={badge.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  opacity: isUnlocked ? 1 : 0.45,
                  border: isUnlocked ? '1.5px solid rgba(245, 158, 11, 0.2)' : '1px solid var(--border-glow)',
                }}
              >
                <div
                  style={{
                    fontSize: '2.5rem',
                    width: '64px',
                    height: '64px',
                    background: isUnlocked ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.02)',
                    border: isUnlocked ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid var(--border-glow)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isUnlocked ? badge.icon : '🔒'}
                </div>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: isUnlocked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {badge.name}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {badge.description}
                  </p>
                  <div style={{ marginTop: '0.4rem' }}>
                    {isUnlocked ? (
                      <span className="pill pill-success" style={{ fontSize: '0.55rem', padding: '0.05rem 0.35rem' }}>Unlocked</span>
                    ) : (
                      <span className="pill pill-warning" style={{ fontSize: '0.55rem', padding: '0.05rem 0.35rem' }}>Locked</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
