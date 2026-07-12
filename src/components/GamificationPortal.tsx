'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatDate } from '@/lib/date';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  xp: number;
  difficulty: string;
  status: string;
  evidenceRequired: boolean;
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

interface Reward {
  id: string;
  name: string;
  description: string | null;
  pointsRequired: number;
  stock: number;
  status: string;
}

interface Redemption {
  id: string;
  rewardId: string;
  pointsSpent: number;
  redeemedAt: string;
  reward: {
    name: string;
  };
}
interface GamificationPortalProps {
  challenges: Challenge[];
  badges: Badge[];
  leaderboard: LeaderboardUser[];
  participations: Participation[];
  rewards: Reward[];
  redemptions: Redemption[];
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
  rewards,
  redemptions,
  currentUser,
}: GamificationPortalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'challenges' | 'rewards'>('challenges');
  const [submitting, setSubmitting] = useState(false);
  const [progressValues, setProgressValues] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newBadges, setNewBadges] = useState<any[]>([]);

  // ----------------------------------------------------
  // CHALLENGE STATE & HANDLERS
  // ----------------------------------------------------
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDesc, setChallengeDesc] = useState('');
  const [challengeXp, setChallengeXp] = useState('100');
  const [challengeDifficulty, setChallengeDifficulty] = useState('medium');
  const [challengeDeadline, setChallengeDeadline] = useState('');
  const [challengeEvidenceRequired, setChallengeEvidenceRequired] = useState(false);

  // Redeeming state
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const isOfficerOrManager = currentUser && (currentUser.role === 'officer' || currentUser.role === 'manager');

  // Find user's active XP/Points dynamically from leaderboard if available
  const dbUser = leaderboard.find(u => u.id === currentUser?.employeeId);
  const activeXp = dbUser ? dbUser.xp : (currentUser?.xp || 0);
  const activePoints = dbUser ? dbUser.points : (currentUser?.points || 0);

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
    } catch {
      setErrorMessage('Unexpected error joining challenge.');
    } finally {
      setSubmitting(false);
    }
  };

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
    } catch {
      setErrorMessage('Unexpected error updating progress.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeTitle || !challengeXp || isNaN(parseInt(challengeXp))) {
      setErrorMessage('Challenge title and numeric XP reward are required.');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-challenge',
          title: challengeTitle,
          description: challengeDesc,
          xp: parseInt(challengeXp),
          difficulty: challengeDifficulty,
          deadline: challengeDeadline ? new Date(challengeDeadline) : null,
          evidenceRequired: challengeEvidenceRequired,
        }),
      });

      if (res.ok) {
        setSuccessMessage('New Gamified Challenge published successfully!');
        setChallengeTitle('');
        setChallengeDesc('');
        setChallengeXp('100');
        setChallengeDifficulty('medium');
        setChallengeDeadline('');
        setChallengeEvidenceRequired(false);
        setShowChallengeForm(false);
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to create challenge.');
      }
    } catch {
      setErrorMessage('Error creating challenge.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) {
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/gamification?id=${challengeId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccessMessage('Challenge deleted successfully.');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to delete challenge.');
      }
    } catch {
      setErrorMessage('Error deleting challenge.');
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // REWARDS STATE & HANDLERS
  // ----------------------------------------------------
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardName, setRewardName] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardPoints, setRewardPoints] = useState('100');
  const [rewardStock, setRewardStock] = useState('5');

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardName || !rewardPoints || !rewardStock) {
      setErrorMessage('Please fill in name, points required, and stock levels.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-reward',
          name: rewardName,
          description: rewardDesc,
          pointsRequired: parseInt(rewardPoints),
          stock: parseInt(rewardStock),
        }),
      });

      if (res.ok) {
        setSuccessMessage('New Reward catalog incentive added successfully!');
        setRewardName('');
        setRewardDesc('');
        setRewardPoints('100');
        setRewardStock('5');
        setShowRewardForm(false);
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to create reward catalog.');
      }
    } catch (err) {
      setErrorMessage('Error adding reward item.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    if (!confirm('Are you sure you want to redeem your points for this reward?')) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem', rewardId }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`Redeemed successfully! Redemptions code: ${data.redemption.id}. Deducted ${data.redemption.pointsSpent} points from your balance.`);
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to redeem reward.');
      }
    } catch {
      setErrorMessage('Unexpected error during redemption.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReward = async (id: string) => {
    if (!confirm('Are you sure you want to delete/disable this reward item?')) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/rewards?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message || 'Reward catalog item deleted.');
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to delete reward.');
      }
    } catch (err) {
      setErrorMessage('Error deleting reward.');
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

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'challenges' ? 'btn-env' : 'btn-secondary'}`}
          onClick={() => setActiveTab('challenges')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          🏆 Challenges & Badges
        </button>
        <button
          className={`btn ${activeTab === 'rewards' ? 'btn-env' : 'btn-secondary'}`}
          onClick={() => setActiveTab('rewards')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          ⚡ Rewards Storefront
        </button>
      </div>

      {/* Profile Header Stats */}
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
                Use points in reward storefront to redeem eco-incentives.
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

      {/* ----------------------------------------------------
          TAB 1: CHALLENGES & BADGES
          ---------------------------------------------------- */}
      {activeTab === 'challenges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Active Challenges */}
          <div>
            <div className="flex-between mb-6">
              <h3 style={{ fontSize: '1.25rem' }}>🌱 Active Eco-Action Challenges</h3>
              {isOfficerOrManager && (
                <button className="btn btn-env" onClick={() => setShowChallengeForm(!showChallengeForm)}>
                  {showChallengeForm ? '✕ Close Form' : '➕ Create Challenge'}
                </button>
              )}
            </div>

            {/* Create Challenge Form */}
            {showChallengeForm && isOfficerOrManager && (
              <div className="glass-card mb-6" style={{ borderLeft: '4px solid var(--accent-social)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Design New Sustainability Challenge</h3>
                <form onSubmit={handleCreateChallenge} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="grid-cols-3" style={{ gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Challenge Title</label>
                      <input type="text" className="form-input" placeholder="e.g. Bring Mug to Work" value={challengeTitle} onChange={(e) => setChallengeTitle(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">XP Reward Value</label>
                      <input type="number" className="form-input" placeholder="e.g. 150" value={challengeXp} onChange={(e) => setChallengeXp(e.target.value)} required min="10" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Difficulty Rating</label>
                      <select className="form-select" value={challengeDifficulty} onChange={(e) => setChallengeDifficulty(e.target.value)}>
                        <option value="easy">Easy (Daily habit)</option>
                        <option value="medium">Medium (Regular effort)</option>
                        <option value="hard">Hard (Organizational change)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid-cols-3" style={{ gap: '1rem' }}>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Description / Directives</label>
                      <input type="text" className="form-input" placeholder="Detail the challenge rules..." value={challengeDesc} onChange={(e) => setChallengeDesc(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Deadline Date (Optional)</label>
                      <input type="date" className="form-input" value={challengeDeadline} onChange={(e) => setChallengeDeadline(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input type="checkbox" checked={challengeEvidenceRequired} onChange={(e) => setChallengeEvidenceRequired(e.target.checked)} />
                      <span>Require evidence proof file to complete this challenge</span>
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowChallengeForm(false)}>Cancel</button>
                    <button type="submit" className="btn btn-env" disabled={submitting}>💾 Publish Challenge</button>
                  </div>
                </form>
              </div>
            )}

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
                      height: '250px',
                      border: isCompleted ? '1.5px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-glow)',
                    }}
                  >
                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                      <span className={`pill ${diffColor}`} style={{ fontSize: '0.65rem' }}>
                        {ch.difficulty.toUpperCase()}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-overall)' }}>
                          ⭐ +{ch.xp} XP
                        </span>
                        {isOfficerOrManager && (
                          <button className="btn" style={{ padding: '0.1rem', background: 'transparent' }} onClick={() => handleDeleteChallenge(ch.id)}>
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{ch.title}</h4>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.4rem', flexGrow: 1, lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {ch.description}
                    </p>
                    {ch.evidenceRequired && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-gov)', marginBottom: '0.5rem', display: 'block' }}>
                        📄 Evidence Required
                      </span>
                    )}

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {isJoined ? (
                        <div>
                          {isCompleted ? (
                            <div className="pill pill-success" style={{ width: '100%', justifyContent: 'center', fontSize: '0.7rem' }}>
                              ✓ Completed & Awarded
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
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

          {/* Badges showcase */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>🏆 Sustainability Badges & Achievements</h3>
            <div className="grid-cols-3" style={{ gap: '1rem' }}>
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
      )}

      {/* ----------------------------------------------------
          TAB 2: REWARDS STOREFRONT (New feature)
          ---------------------------------------------------- */}
      {activeTab === 'rewards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="flex-between">
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>⚡ Eco-Incentive Catalog</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginTop: '0.25rem' }}>
                Redeem your earned sustainability points for real-world environmental incentives.
              </p>
            </div>
            {isOfficerOrManager && !showRewardForm && (
              <button className="btn btn-env" onClick={() => setShowRewardForm(true)}>
                ➕ Add Reward Item
              </button>
            )}
          </div>

          {/* Create Reward Form */}
          {showRewardForm && isOfficerOrManager && (
            <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-overall)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Add New Reward Item to Catalog</h3>
              <form onSubmit={handleCreateReward} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Reward Name</label>
                    <input type="text" className="form-input" placeholder="e.g. Stainless Steel Thermal Flask" value={rewardName} onChange={(e) => setRewardName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Points Required to Redeem</label>
                    <input type="number" className="form-input" placeholder="e.g. 120" value={rewardPoints} onChange={(e) => setRewardPoints(e.target.value)} min="1" required />
                  </div>
                </div>
                <div className="grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Description</label>
                    <input type="text" className="form-input" placeholder="Describe the item..." value={rewardDesc} onChange={(e) => setRewardDesc(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock Quantity Available</label>
                    <input type="number" className="form-input" placeholder="e.g. 10" value={rewardStock} onChange={(e) => setRewardStock(e.target.value)} min="0" required />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRewardForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-env" disabled={submitting}>Announce Reward Item</button>
                </div>
              </form>
            </div>
          )}

          {/* Reward Catalog Items Grid */}
          <div className="grid-cols-3" style={{ gap: '1rem' }}>
            {rewards.map((reward) => {
              const hasStock = reward.stock > 0;
              const hasPoints = activePoints >= reward.pointsRequired;
              const isInactive = reward.status !== 'active';
              
              const borderStyle = isInactive 
                ? '1px dashed var(--border-glow)' 
                : hasStock 
                ? '1.5px solid rgba(6, 182, 212, 0.15)' 
                : '1px solid var(--border-glow)';

              return (
                <div key={reward.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '220px', border: borderStyle, opacity: isInactive ? 0.5 : 1 }}>
                  <div className="flex-between">
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-gov)', fontWeight: 700 }}>⚡ {reward.pointsRequired} Points</span>
                    <span className={`pill ${hasStock ? 'pill-success' : 'pill-error'}`} style={{ fontSize: '0.6rem' }}>
                      {isInactive ? 'INACTIVE' : hasStock ? `${reward.stock} in stock` : 'OUT OF STOCK'}
                    </span>
                  </div>

                  <h4 style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.5rem' }}>{reward.name}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', flexGrow: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {reward.description || 'No description listed.'}
                  </p>

                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                    {isInactive ? (
                      <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.75rem', cursor: 'default' }} disabled>Unavailable</button>
                    ) : hasStock ? (
                      <button
                        className={hasPoints ? 'btn btn-env' : 'btn btn-secondary'}
                        style={{ flexGrow: 1, fontSize: '0.75rem' }}
                        onClick={() => handleRedeemReward(reward.id)}
                        disabled={submitting || !hasPoints}
                      >
                        {hasPoints ? '🛍️ Redeem Incentive' : '🔒 Insufficient Points'}
                      </button>
                    ) : (
                      <button className="btn btn-secondary" style={{ flexGrow: 1, fontSize: '0.75rem' }} disabled>Out of Stock</button>
                    )}
                    {isOfficerOrManager && (
                      <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => handleDeleteReward(reward.id)}>🗑️</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Redemptions Log */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Personal Redemption History Log</h3>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Redeemed Date</th>
                    <th>Redemption Code</th>
                    <th>Reward Incentive Item</th>
                    <th>Points Deducted</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((red) => (
                    <tr key={red.id}>
                      <td style={{ fontSize: '0.85rem' }}>{formatDate(red.redeemedAt)}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{red.id}</td>
                      <td style={{ fontWeight: 600 }}>{red.reward.name}</td>
                      <td style={{ fontWeight: 700, color: '#f87171' }}>-{red.pointsSpent} Points</td>
                    </tr>
                  ))}
                  {redemptions.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                        No points redemptions logged for your account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
