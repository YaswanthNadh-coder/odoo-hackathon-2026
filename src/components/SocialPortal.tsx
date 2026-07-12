'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface CSRActivity {
  id: string;
  title: string;
  description: string | null;
  date: string;
}

interface Participation {
  id: string;
  employeeId: string;
  activityId: string;
  approvalStatus: string;
  proofUrl: string | null;
  pointsEarned: number;
  completedAt: string | null;
  activity: {
    title: string;
  };
  employee: {
    name: string;
    department: {
      name: string;
      code: string;
    };
  };
}

interface SocialPortalProps {
  activities: CSRActivity[];
  participations: Participation[];
  evidenceRequiredEnabled: boolean;
  currentUser: {
    employeeId: string;
    name: string;
    role: string;
    departmentId: string;
    departmentCode: string;
  } | null;
}

const TRAININGS = [
  { id: 'conduct', name: 'Annual ESG Code of Conduct Training', description: 'Mandatory handbook sign-off on ethical policies, anti-corruption, and diversity codes.', xp: 30 },
  { id: 'footprint', name: 'Carbon Auditing & Bookkeeping Workshop', description: 'Advanced seminar on Scope 1, 2, and 3 accounting calculation mechanics.', xp: 40 },
  { id: 'supply', name: 'Sustainable Procurement Seminar', description: 'Guidelines on vetting vendors against global sustainability directives.', xp: 30 },
];

export default function SocialPortal({
  activities,
  participations,
  evidenceRequiredEnabled,
  currentUser,
}: SocialPortalProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [activeParticipationId, setActiveParticipationId] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newBadges, setNewBadges] = useState<any[]>([]);

  // Activity creation fields
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDesc, setActivityDesc] = useState('');
  const [activityDate, setActivityDate] = useState('');

  // Local storage for completed training ids
  const [completedTrainings, setCompletedTrainings] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`completed_trainings_${currentUser?.employeeId}`);
      if (stored) {
        // eslint-disable-next-line
        setCompletedTrainings(JSON.parse(stored));
      }
    }
  }, [currentUser?.employeeId]);

  const isOfficerOrManager = currentUser && (currentUser.role === 'officer' || currentUser.role === 'manager');

  // Format dates securely
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'N/A';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Register / Join Activity (creates a "joined" participation)
  const handleJoinActivity = async (activityId: string) => {
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Successfully joined the activity! You can now request approval when ready.');
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to join activity.');
      }
    } catch (err) {
      setErrorMessage('Unexpected error joining activity.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterWithEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParticipationId) return;

    if (evidenceRequiredEnabled && !proofUrl) {
      setErrorMessage('Proof file URL is required under current governance rules.');
      return;
    }

    submitApprovalRequest(activeParticipationId, proofUrl);
  };

  const submitApprovalRequest = async (participationId: string, proof: string) => {
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request-approval', participationId, proofUrl: proof }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Approval request logged! Pending department manager approval.');
        setProofUrl('');
        setActiveParticipationId(null);
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to submit approval request.');
      }
    } catch (err) {
      setErrorMessage('Unexpected error submitting request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Create or Edit CSR Activity
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle) {
      setErrorMessage('Activity title is required.');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const url = '/api/social';
    const method = editingActivityId ? 'PUT' : 'POST';
    const body = editingActivityId ? {
      id: editingActivityId,
      title: activityTitle,
      description: activityDesc,
      date: activityDate ? new Date(activityDate) : undefined,
    } : {
      action: 'create-activity',
      title: activityTitle,
      description: activityDesc,
      date: activityDate ? new Date(activityDate) : new Date(),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccessMessage(editingActivityId ? 'CSR Activity updated successfully!' : 'CSR Activity created successfully!');
        resetActivityForm();
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to save activity.');
      }
    } catch {
      setErrorMessage('Error saving activity.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditActivityClick = (act: CSRActivity) => {
    setEditingActivityId(act.id);
    setActivityTitle(act.title);
    setActivityDesc(act.description || '');
    setActivityDate(act.date ? act.date.substring(0, 10) : '');
    setShowActivityForm(true);
  };

  const resetActivityForm = () => {
    setEditingActivityId(null);
    setActivityTitle('');
    setActivityDesc('');
    setActivityDate('');
    setShowActivityForm(false);
  };

  // Delete CSR Activity
  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this CSR activity? This will also delete all employees\' participations logged under this activity.')) {
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/social?id=${activityId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccessMessage('CSR Activity deleted successfully.');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to delete activity.');
      }
    } catch {
      setErrorMessage('Error deleting CSR activity.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Approve/Reject
  const handleApprovalAction = async (participationId: string, status: 'approved' | 'rejected') => {
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setNewBadges([]);

    try {
      const res = await fetch('/api/social/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participationId, status }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`Participation was ${status}!`);
        if (data.awardedBadges && data.awardedBadges.length > 0) {
          setNewBadges(data.awardedBadges);
        }
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to complete approval action.');
      }
    } catch {
      setErrorMessage('Error performing approval action.');
    } finally {
      setSubmitting(false);
    }
  };

  // Complete Training Course
  const handleCompleteTraining = async (trainingId: string, xpReward: number) => {
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/social/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainingId, xpReward }),
      });

      const data = await res.json();
      if (res.ok) {
        const updated = [...completedTrainings, trainingId];
        setCompletedTrainings(updated);
        localStorage.setItem(`completed_trainings_${currentUser?.employeeId}`, JSON.stringify(updated));
        setSuccessMessage(`Training Completed successfully! Awarded +${xpReward} XP & Points.`);
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to submit training record.');
      }
    } catch {
      setErrorMessage('Unexpected error updating training completion.');
    } finally {
      setSubmitting(false);
    }
  };

  const canApprove = currentUser && (currentUser.role === 'manager' || currentUser.role === 'officer');
  
  const pendingParticipations = participations.filter((p) => 
    p.approvalStatus === 'pending'
  );
  const historyParticipations = participations.filter((p) => p.approvalStatus !== 'pending');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Alert Banner */}
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

      {/* Diversity & Training Top Row Grid */}
      <div className="grid-cols-3">
        {/* Diversity & Inclusion breakdown */}
        <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--accent-overall)' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>📊 Diversity & Representation Dashlet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Corporate social audit benchmarks across operational business units.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1, justifyContent: 'center' }}>
            {/* Gender diversity */}
            <div>
              <div className="flex-between" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 600 }}>Gender Representation Ratios</span>
                <span style={{ color: 'var(--text-muted)' }}>46% Female | 48% Male | 6% Non-Binary</span>
              </div>
              <div style={{ display: 'flex', width: '100%', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '46%', background: 'var(--accent-overall-gradient)' }} />
                <div style={{ width: '48%', background: 'rgba(255,255,255,0.15)' }} />
                <div style={{ width: '6%', background: 'var(--accent-gov)' }} />
              </div>
            </div>

            {/* Department female leadership index */}
            <div className="grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <div className="flex-between" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                  <span>Corporate Leadership Diversity</span>
                  <span style={{ fontWeight: 700 }}>80%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '80%', height: '100%', background: 'var(--accent-social)' }} />
                </div>
              </div>
              <div>
                <div className="flex-between" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                  <span>Engineering (R&D) Diversity</span>
                  <span style={{ fontWeight: 700 }}>75%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '75%', height: '100%', background: 'var(--accent-env)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ESG Training Checklist */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '240px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>🎓 ESG Compliance Training</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flexGrow: 1 }}>
            {TRAININGS.map((tr) => {
              const isCompleted = completedTrainings.includes(tr.id);
              return (
                <div key={tr.id} style={{ padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '70%', textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.name}</div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--accent-social)', fontWeight: 'bold' }}>⭐ +{tr.xp} XP</span>
                  </div>
                  {isCompleted ? (
                    <span className="pill pill-success" style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem' }}>✓ Done</span>
                  ) : (
                    <button
                      className="btn btn-primary"
                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem' }}
                      onClick={() => handleCompleteTraining(tr.id, tr.xp)}
                      disabled={submitting}
                    >
                      Certify
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 1. Manager / Department Head Approval Dashboard */}
      {canApprove && (
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>📥 Pending CSR Approvals Control Dashboard</h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>CSR Activity Title</th>
                  <th>Evidence/Proof</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingParticipations.map((part) => (
                  <tr key={part.id}>
                    <td style={{ fontWeight: 600 }}>{part.employee.name}</td>
                    <td>{part.employee.department.name}</td>
                    <td style={{ fontWeight: 500 }}>{part.activity.title}</td>
                    <td>
                      {part.proofUrl ? (
                        <a href={part.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-overall)', textDecoration: 'underline' }}>
                          📄 View Proof
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No evidence uploaded</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-env"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          onClick={() => handleApprovalAction(part.id, 'approved')}
                          disabled={submitting}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderLeft: '3px solid #ef4444' }}
                          onClick={() => handleApprovalAction(part.id, 'rejected')}
                          disabled={submitting}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingParticipations.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                      🟢 No pending approval requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Join CSR Activity Modal / Inline Form if active */}
      {activeParticipationId && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-social)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Submit Evidence for CSR Activity</h3>
          <form onSubmit={handleRegisterWithEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Evidence File URL or Description</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. /proofs/cleanup_receipt.jpg or description of task"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                required={evidenceRequiredEnabled}
              />
              {evidenceRequiredEnabled && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Corporate Governance rule: An evidence file or proof path must be attached to qualify for approval.
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : '🚀 Submit Request'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveParticipationId(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. CSR Activities Grid & Creator Form */}
      <div>
        <div className="flex-between mb-6">
          <h3 style={{ fontSize: '1.25rem' }}>CSR Engagement Initiatives</h3>
          {isOfficerOrManager && (
            <button className="btn btn-env" onClick={() => setShowActivityForm(!showActivityForm)}>
              {showActivityForm ? '✕ Close Form' : '➕ Create CSR Activity'}
            </button>
          )}
        </div>

        {/* Create CSR Activity Form */}
        {showActivityForm && isOfficerOrManager && (
          <div className="glass-card mb-6" style={{ borderLeft: '4px solid var(--accent-env)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
              {editingActivityId ? '✏️ Edit CSR Activity Drive' : 'Announce CSR Activity Drive'}
            </h3>
            <form onSubmit={handleCreateActivity} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-cols-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Activity Title</label>
                  <input type="text" className="form-input" placeholder="e.g. River Bank Restoration" value={activityTitle} onChange={(e) => setActivityTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Event Date</label>
                  <input type="date" className="form-input" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description / Instructions</label>
                <textarea className="form-textarea" rows={3} placeholder="Provide volunteering instructions..." value={activityDesc} onChange={(e) => setActivityDesc(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={resetActivityForm}>Cancel</button>
                <button type="submit" className="btn btn-env" disabled={submitting}>
                  {editingActivityId ? '💾 Save Changes' : '💾 Announce Event'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid-cols-3">
          {activities.map((act) => {
            const isRegistered = participations.some(
              (p) => p.employeeId === currentUser?.employeeId && p.activityId === act.id
            );
            const userPart = participations.find(
              (p) => p.employeeId === currentUser?.employeeId && p.activityId === act.id
            );

            return (
              <div key={act.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '220px' }}>
                <div className="flex-between">
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{act.title}</h4>
                  {isOfficerOrManager && (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn" style={{ padding: '0.2rem', background: 'transparent', fontSize: '0.95rem' }} onClick={() => handleEditActivityClick(act)}>
                        ✏️
                      </button>
                      <button className="btn" style={{ padding: '0.2rem', background: 'transparent', fontSize: '0.95rem' }} onClick={() => handleDeleteActivity(act.id)}>
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.5rem', flexGrow: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                  {act.description || 'No description available.'}
                </p>
                <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    📅 {formatDate(act.date)}
                  </span>
                  
                  {isRegistered ? (
                    userPart?.approvalStatus === 'joined' ? (
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => setActiveParticipationId(userPart.id)}
                        disabled={submitting}
                      >
                        Request Approval
                      </button>
                    ) : (
                      <span 
                        className={`pill ${
                          userPart?.approvalStatus === 'approved' 
                            ? 'pill-success' 
                            : userPart?.approvalStatus === 'rejected'
                            ? 'pill-error'
                            : 'pill-warning'
                        }`}
                        style={{ fontSize: '0.65rem' }}
                      >
                        {userPart?.approvalStatus.toUpperCase()}
                      </span>
                    )
                  ) : (
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => handleJoinActivity(act.id)}
                      disabled={submitting}
                    >
                      Join
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. CSR History Ledger */}
      <div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>CSR Engagement History</h3>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Completed Date</th>
                <th>Employee</th>
                <th>Department</th>
                <th>CSR Activity Title</th>
                <th>Status</th>
                <th>Points Earned</th>
              </tr>
            </thead>
            <tbody>
              {historyParticipations.map((part) => (
                <tr key={part.id}>
                  <td style={{ fontSize: '0.85rem' }}>
                    {part.completedAt ? formatDate(part.completedAt) : 'N/A'}
                  </td>
                  <td style={{ fontWeight: 600 }}>{part.employee.name}</td>
                  <td>{part.employee.department.name}</td>
                  <td>{part.activity.title}</td>
                  <td>
                    <span className={`pill ${part.approvalStatus === 'approved' ? 'pill-success' : 'pill-error'}`} style={{ fontSize: '0.65rem' }}>
                      {part.approvalStatus.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-env)' }}>+{part.pointsEarned} Points</td>
                </tr>
              ))}
              {historyParticipations.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                    No completed CSR activities in archive database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
