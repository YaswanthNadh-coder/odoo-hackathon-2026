'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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

export default function SocialPortal({
  activities,
  participations,
  evidenceRequiredEnabled,
  currentUser,
}: SocialPortalProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newBadges, setNewBadges] = useState<any[]>([]);

  // Register / Join Activity (creates a pending participation)
  const handleJoinActivity = async (activityId: string) => {
    setActiveActivityId(activityId);
    setErrorMessage('');
    setSuccessMessage('');
    
    // If evidence is NOT required, register immediately
    if (!evidenceRequiredEnabled) {
      submitRegistration(activityId, '');
    }
  };

  const handleRegisterWithEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActivityId) return;

    if (evidenceRequiredEnabled && !proofUrl) {
      setErrorMessage('Proof file URL is required under current governance rules.');
      return;
    }

    submitRegistration(activeActivityId, proofUrl);
  };

  const submitRegistration = async (activityId: string, proof: string) => {
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, proofUrl: proof }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Participation request logged! Pending department manager approval.');
        setProofUrl('');
        setActiveActivityId(null);
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to submit registration.');
      }
    } catch (err) {
      setErrorMessage('Unexpected error submitting registration.');
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
    } catch (err) {
      setErrorMessage('Error performing approval action.');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if current user role allows approvals (Manager or Compliance Officer)
  const canApprove = currentUser && (currentUser.role === 'manager' || currentUser.role === 'officer');
  
  // Filter pending participations
  const pendingParticipations = participations.filter((p) => p.approvalStatus === 'pending');
  // Filter history
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
      {activeActivityId && evidenceRequiredEnabled && (
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
                required
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Corporate Governance rule: An evidence file or proof path must be attached to qualify for approval.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : '🚀 Submit Log'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveActivityId(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. CSR Activities Grid */}
      <div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>CSR Engagement Initiatives</h3>
        <div className="grid-cols-3">
          {activities.map((act) => {
            // Check if current user is registered
            const isRegistered = participations.some(
              (p) => p.employeeId === currentUser?.employeeId && p.activityId === act.id
            );
            const userPart = participations.find(
              (p) => p.employeeId === currentUser?.employeeId && p.activityId === act.id
            );

            return (
              <div key={act.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '200px' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{act.title}</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.5rem', flexGrow: 1 }}>
                  {act.description || 'No description available.'}
                </p>
                <div className="flex-between" style={{ marginTop: 'auto' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    📅 {new Date(act.date).toLocaleDateString()}
                  </span>
                  
                  {isRegistered ? (
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
                    {part.completedAt ? new Date(part.completedAt).toLocaleDateString() : 'N/A'}
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
