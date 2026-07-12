'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

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

interface Reward {
  id: string;
  name: string;
  description: string | null;
  pointsRequired: number;
  stock: number;
  status: string;
}

interface GamificationPortalProps {
  challenges: Challenge[];
  badges: Badge[];
  leaderboard: LeaderboardUser[];
  participations: Participation[];
  rewards: Reward[];
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
  currentUser,
}: GamificationPortalProps) {
  const router = useRouter();

  // Polling for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 15000);
    return () => clearInterval(interval);
  }, [router]);

  const [submitting, setSubmitting] = useState(false);
  const [progressValues, setProgressValues] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newBadges, setNewBadges] = useState<any[]>([]);

  // Challenge creation fields
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDesc, setChallengeDesc] = useState('');
  const [challengeXp, setChallengeXp] = useState('100');
  const [challengeDifficulty, setChallengeDifficulty] = useState('medium');
  const [challengeStatus, setChallengeStatus] = useState('active');
  const [challengeDeadline, setChallengeDeadline] = useState('');

  // Redeeming state
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  // Rewards Management state
  const [rewardActiveTab, setRewardActiveTab] = useState<'redeem' | 'manage'>('redeem');
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [rewardName, setRewardName] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardPoints, setRewardPoints] = useState('');
  const [rewardStock, setRewardStock] = useState('');

  const isOfficerOrManager = currentUser && (currentUser.role === 'officer' || currentUser.role === 'manager');

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
    } catch {
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
    } catch {
      setErrorMessage('Unexpected error updating progress.');
    } finally {
      setSubmitting(false);
    }
  };

  // Create or Edit Challenge
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeTitle || !challengeXp || isNaN(parseInt(challengeXp))) {
      setErrorMessage('Challenge title and numeric XP reward are required.');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const url = '/api/gamification';
    const method = editingChallengeId ? 'PUT' : 'POST';
    const body = editingChallengeId ? {
      id: editingChallengeId,
      title: challengeTitle,
      description: challengeDesc,
      xp: parseInt(challengeXp),
      difficulty: challengeDifficulty,
      status: challengeStatus,
      deadline: challengeDeadline ? new Date(challengeDeadline) : null,
    } : {
      action: 'create-challenge',
      title: challengeTitle,
      description: challengeDesc,
      xp: parseInt(challengeXp),
      difficulty: challengeDifficulty,
      status: challengeStatus,
      deadline: challengeDeadline ? new Date(challengeDeadline) : null,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccessMessage(editingChallengeId ? 'Challenge updated successfully!' : 'New Gamified Challenge published successfully!');
        resetChallengeForm();
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to save challenge.');
      }
    } catch {
      setErrorMessage('Error saving challenge.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditChallengeClick = (ch: Challenge) => {
    setEditingChallengeId(ch.id);
    setChallengeTitle(ch.title);
    setChallengeDesc(ch.description || '');
    setChallengeXp(String(ch.xp));
    setChallengeDifficulty(ch.difficulty);
    setChallengeStatus(ch.status);
    setChallengeDeadline(ch.deadline ? ch.deadline.substring(0, 10) : '');
    setShowChallengeForm(true);
  };

  const resetChallengeForm = () => {
    setEditingChallengeId(null);
    setChallengeTitle('');
    setChallengeDesc('');
    setChallengeXp('100');
    setChallengeDifficulty('medium');
    setChallengeStatus('active');
    setChallengeDeadline('');
    setShowChallengeForm(false);
  };

  // Delete Challenge
  const handleDeleteChallenge = async (challengeId: string) => {
    if (!confirm('Are you sure you want to delete this challenge? This will also delete all employees\' challenge participations.')) {
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

  // Rewards Catalog CRUD actions
  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardName || !rewardPoints || !rewardStock) {
      setErrorMessage('Please fill in all reward fields.');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const url = '/api/gamification/rewards';
    const method = editingRewardId ? 'PUT' : 'POST';
    const body = {
      id: editingRewardId,
      name: rewardName,
      description: rewardDesc,
      pointsRequired: parseInt(rewardPoints),
      stock: parseInt(rewardStock),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccessMessage(editingRewardId ? 'Reward updated successfully!' : 'New Reward added to catalog!');
        resetRewardForm();
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to save reward.');
      }
    } catch {
      setErrorMessage('Error saving reward details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRewardClick = (rew: Reward) => {
    setEditingRewardId(rew.id);
    setRewardName(rew.name);
    setRewardDesc(rew.description || '');
    setRewardPoints(String(rew.pointsRequired));
    setRewardStock(String(rew.stock));
    setShowRewardForm(true);
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!confirm('Are you sure you want to delete this reward from the catalog?')) {
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/gamification/rewards?id=${rewardId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccessMessage('Reward deleted successfully.');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to delete reward.');
      }
    } catch {
      setErrorMessage('Error deleting reward.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetRewardForm = () => {
    setEditingRewardId(null);
    setRewardName('');
    setRewardDesc('');
    setRewardPoints('');
    setRewardStock('');
    setShowRewardForm(false);
  };
  const handleRedeemReward = async (rewardId: string) => {
    setRedeemingId(rewardId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/gamification/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`Successfully redeemed ${data.rewardName}! point balance deducted.`);
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to redeem reward.');
      }
    } catch {
      setErrorMessage('Unexpected error during redemption.');
    } finally {
      setRedeemingId(null);
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
                Use points to redeem rewards from the catalog store.
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
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
              {editingChallengeId ? '✏️ Edit Sustainability Challenge' : 'Design New Sustainability Challenge'}
            </h3>
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
              <div className="grid-cols-3" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Challenge Status</label>
                  <select className="form-select" value={challengeStatus} onChange={(e) => setChallengeStatus(e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="review">Under Review</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={resetChallengeForm}>Cancel</button>
                <button type="submit" className="btn btn-env" disabled={submitting}>
                  {editingChallengeId ? '💾 Save Changes' : '💾 Publish Challenge'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid-cols-3">
          {challenges
            .filter((ch) => isOfficerOrManager || ch.status === 'active')
            .map((ch) => {
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
                  opacity: ch.status === 'active' ? 1 : 0.6,
                }}
              >
                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <span className={`pill ${diffColor}`} style={{ fontSize: '0.6rem' }}>
                      {ch.difficulty.toUpperCase()}
                    </span>
                    {isOfficerOrManager && ch.status !== 'active' && (
                      <span className="pill pill-warning" style={{ fontSize: '0.6rem' }}>
                        {ch.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-overall)' }}>
                      ⭐ +{ch.xp} XP
                    </span>
                    {isOfficerOrManager && (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn" style={{ padding: '0.1rem', background: 'transparent' }} onClick={() => handleEditChallengeClick(ch)}>
                          ✏️
                        </button>
                        <button className="btn" style={{ padding: '0.1rem', background: 'transparent' }} onClick={() => handleDeleteChallenge(ch.id)}>
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{ch.title}</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.4rem', flexGrow: 1, lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
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

      {/* Row 3: Rewards Catalog Store (Redeemable incentives) */}
      <div>
        <div className="flex-between mb-6">
          <h3 style={{ fontSize: '1.25rem' }}>🛍️ ESG Incentives & Rewards Store</h3>
          {isOfficerOrManager && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: rewardActiveTab === 'redeem' ? 'rgba(255,255,255,0.06)' : 'transparent' }}
                onClick={() => setRewardActiveTab('redeem')}
              >
                Catalog View
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: rewardActiveTab === 'manage' ? 'rgba(255,255,255,0.06)' : 'transparent' }}
                onClick={() => setRewardActiveTab('manage')}
              >
                ⚙️ Manage Catalog
              </button>
            </div>
          )}
        </div>

        {rewardActiveTab === 'redeem' ? (
          <div className="grid-cols-3">
            {rewards.map((reward) => {
              const canAfford = activePoints >= reward.pointsRequired;
              const hasStock = reward.stock > 0;
              const isRedeeming = redeemingId === reward.id;

              return (
                <div
                  key={reward.id}
                  className="glass-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '180px',
                    border: hasStock ? '1px solid var(--border-glow)' : '1px solid rgba(255, 0, 0, 0.1)',
                    opacity: hasStock ? 1 : 0.6,
                  }}
                >
                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <span className={`pill ${hasStock ? 'pill-info' : 'pill-error'}`} style={{ fontSize: '0.65rem' }}>
                      {hasStock ? `Stock: ${reward.stock} left` : 'OUT OF STOCK'}
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-gov)', fontSize: '0.9rem' }}>
                      ⚡ {reward.pointsRequired} Pts
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{reward.name}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', flexGrow: 1 }}>
                    {reward.description || 'No description available.'}
                  </p>

                  <div style={{ marginTop: '1rem' }}>
                    <button
                      className={`btn ${canAfford && hasStock ? 'btn-env' : 'btn-secondary'}`}
                      style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem' }}
                      onClick={() => handleRedeemReward(reward.id)}
                      disabled={isRedeeming || !canAfford || !hasStock}
                    >
                      {isRedeeming
                        ? 'Redeeming...'
                        : !hasStock
                        ? 'Out of Stock'
                        : !canAfford
                        ? `Need ${reward.pointsRequired - activePoints} more Points`
                        : '🛒 Redeem Reward'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          isOfficerOrManager && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="flex-between">
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Catalog Inventory</span>
                {!showRewardForm && (
                  <button className="btn btn-env" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowRewardForm(true)}>
                    ➕ Add New Reward
                  </button>
                )}
              </div>

              {showRewardForm && (
                <div className="glass-card mb-6" style={{ borderLeft: '4px solid var(--accent-gov)' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                    {editingRewardId ? '✏️ Edit Catalog Reward Item' : '➕ Create New Catalog Reward Item'}
                  </h4>
                  <form onSubmit={handleSaveReward} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="grid-cols-3" style={{ gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Reward Name</label>
                        <input type="text" className="form-input" placeholder="e.g. KeepCup Thermo" value={rewardName} onChange={(e) => setRewardName(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Points Cost</label>
                        <input type="number" className="form-input" placeholder="e.g. 200" value={rewardPoints} onChange={(e) => setRewardPoints(e.target.value)} required min="1" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Available Stock</label>
                        <input type="number" className="form-input" placeholder="e.g. 15" value={rewardStock} onChange={(e) => setRewardStock(e.target.value)} required min="0" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input type="text" className="form-input" placeholder="e.g. Dual-wall vacuum insulated stainless steel tumbler..." value={rewardDesc} onChange={(e) => setRewardDesc(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button type="button" className="btn btn-secondary" onClick={resetRewardForm}>Cancel</button>
                      <button type="submit" className="btn btn-env" disabled={submitting}>
                        {editingRewardId ? '💾 Save Changes' : '💾 Add Item'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Points Cost</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.map((rew) => (
                      <tr key={rew.id}>
                        <td style={{ fontWeight: 600 }}>{rew.name}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-gov)' }}>⚡ {rew.pointsRequired} Pts</td>
                        <td>{rew.stock} units</td>
                        <td>
                          <span className={`pill ${rew.stock > 0 ? 'pill-success' : 'pill-error'}`} style={{ fontSize: '0.65rem' }}>
                            {rew.stock > 0 ? 'ACTIVE' : 'OUT OF STOCK'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleEditRewardClick(rew)}>
                              ✏️ Edit
                            </button>
                            <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: 'transparent' }} onClick={() => handleDeleteReward(rew.id)}>
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>

      {/* Row 4: Badges Achievements Showcase */}
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
