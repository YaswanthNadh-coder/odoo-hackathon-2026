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

interface EmployeeDemographics {
  id: string;
  name: string;
  role: string;
  gender: string | null;
  ethnicity: string | null;
  department: {
    name: string;
    code: string;
  };
}

interface TrainingCourse {
  id: string;
  title: string;
  description: string | null;
  hours: number;
}

interface TrainingCompletion {
  id: string;
  courseId: string;
  employeeId: string;
  completedAt: string;
  course: {
    title: string;
    hours: number;
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
  employees: EmployeeDemographics[];
  courses: TrainingCourse[];
  trainingCompletions: TrainingCompletion[];
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
  employees,
  courses,
  trainingCompletions,
  evidenceRequiredEnabled,
  currentUser,
}: SocialPortalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'csr' | 'diversity' | 'training'>('csr');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newBadges, setNewBadges] = useState<any[]>([]);

  // ----------------------------------------------------
  // CSR STATE & HANDLERS
  // ----------------------------------------------------
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDesc, setActivityDesc] = useState('');
  const [activityDate, setActivityDate] = useState('');

  // Local storage for completed training ids
  const [completedTrainings, setCompletedTrainings] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`completed_trainings_${currentUser?.employeeId}`);
      if (stored) {
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
  const handleJoinActivity = async (activityId: string) => {
    setActiveActivityId(activityId);
    setErrorMessage('');
    setSuccessMessage('');
    
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

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle) {
      setErrorMessage('Activity title is required.');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-activity',
          title: activityTitle,
          description: activityDesc,
          date: activityDate ? new Date(activityDate) : new Date(),
        }),
      });

      if (res.ok) {
        setSuccessMessage('CSR Activity created successfully!');
        setActivityTitle('');
        setActivityDesc('');
        setActivityDate('');
        setShowActivityForm(false);
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to create activity.');
      }
    } catch (err) {
      setErrorMessage('Error creating activity.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this CSR activity?')) {
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
    } catch (err) {
      setErrorMessage('Error deleting CSR activity.');
    } finally {
      setSubmitting(false);
    }
  };

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

  // ----------------------------------------------------
  // TRAINING STATE & HANDLERS
  // ----------------------------------------------------
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseHours, setCourseHours] = useState('1.5');

  const handleCompleteTraining = async (courseId: string) => {
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/social/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', courseId }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Training course completion logged! Earned +50 Points and +50 XP!');
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to log completion.');
      }
    } catch (err) {
      setErrorMessage('Error logging training completion.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle || !courseHours) {
      setErrorMessage('Please fill in title and hours.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/social/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-course',
          title: courseTitle,
          description: courseDesc,
          hours: parseFloat(courseHours),
        }),
      });

      if (res.ok) {
        setSuccessMessage('New Training Course announced!');
        setCourseTitle('');
        setCourseDesc('');
        setCourseHours('1.5');
        setShowCourseForm(false);
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to create training course.');
      }
    } catch (err) {
      setErrorMessage('Error creating training course.');
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // DIVERSITY CALCULATIONS (On-the-fly)
  // ----------------------------------------------------
  const totalEmployees = employees.length;
  
  // Gender stats
  const genders = employees.map(e => e.gender || 'Unknown');
  const genderCounts = genders.reduce((acc: any, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, {});

  // Ethnicity stats
  const ethnicities = employees.map(e => e.ethnicity || 'Unknown');
  const ethnicityCounts = ethnicities.reduce((acc: any, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, {});

  // Department Distribution
  const deptCounts = employees.reduce((acc: any, curr) => {
    const code = curr.department.code;
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});

  const canApprove = currentUser && (currentUser.role === 'manager' || currentUser.role === 'officer');
  
  const pendingParticipations = participations.filter((p) => p.approvalStatus === 'pending');
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

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'csr' ? 'btn-env' : 'btn-secondary'}`}
          onClick={() => setActiveTab('csr')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          🤝 CSR Initiatives
        </button>
        <button
          className={`btn ${activeTab === 'diversity' ? 'btn-env' : 'btn-secondary'}`}
          onClick={() => setActiveTab('diversity')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          📊 Diversity Metrics
        </button>
        <button
          className={`btn ${activeTab === 'training' ? 'btn-env' : 'btn-secondary'}`}
          onClick={() => setActiveTab('training')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          🎓 Training Compliance
        </button>
      </div>

      {/* ----------------------------------------------------
          TAB 1: CSR INITIATIVES (Existing features)
          ---------------------------------------------------- */}
      {activeTab === 'csr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Manager / Department Head Approval Dashboard */}
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

          {/* Join CSR Activity Modal / Inline Form if active */}
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

          {/* CSR Activities Grid & Creator Form */}
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
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Announce CSR Activity Drive</h3>
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
                    <button type="button" className="btn btn-secondary" onClick={() => setShowActivityForm(false)}>Cancel</button>
                    <button type="submit" className="btn btn-env" disabled={submitting}>💾 Announce Event</button>
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
                        <button className="btn" style={{ padding: '0.2rem', background: 'transparent', fontSize: '0.95rem' }} onClick={() => handleDeleteActivity(act.id)}>
                          🗑️
                        </button>
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

          {/* CSR History Ledger */}
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
      )}

      {/* ----------------------------------------------------
          TAB 2: DIVERSITY METRICS (New feature)
          ---------------------------------------------------- */}
      {activeTab === 'diversity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem' }}>Workplace Diversity & Demographic Metrics</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginTop: '0.25rem' }}>
              Aggregated demographic indices compiled directly from live active employee HR profiles.
            </p>
          </div>

          <div className="grid-cols-3" style={{ gap: '1.5rem' }}>
            {/* Gender Demographics */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--accent-overall)' }}>
              <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>Gender Representation</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.keys(genderCounts).map((gKey) => {
                  const count = genderCounts[gKey];
                  const percent = totalEmployees > 0 ? (count / totalEmployees) * 100 : 0;
                  const color = gKey === 'Female' ? '#ec4899' : gKey === 'Male' ? '#3b82f6' : 'var(--accent-social)';

                  return (
                    <div key={gKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                        <span>{gKey}</span>
                        <span>{count} ({percent.toFixed(1)}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: '4px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ethnicity Demographics */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--accent-gov)' }}>
              <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>Ethnic Diversity</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.keys(ethnicityCounts).map((ethKey) => {
                  const count = ethnicityCounts[ethKey];
                  const percent = totalEmployees > 0 ? (count / totalEmployees) * 100 : 0;

                  return (
                    <div key={ethKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                        <span>{ethKey}</span>
                        <span>{count} ({percent.toFixed(1)}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: 'var(--accent-env)', borderRadius: '4px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Department Headcounts */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--accent-env)' }}>
              <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>Department Representation</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.keys(deptCounts).map((dKey) => {
                  const count = deptCounts[dKey];
                  const percent = totalEmployees > 0 ? (count / totalEmployees) * 100 : 0;

                  return (
                    <div key={dKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                        <span>{dKey} Department</span>
                        <span>{count} staff ({percent.toFixed(1)}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: 'var(--accent-overall)', borderRadius: '4px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 3: TRAINING COMPLIANCE (New feature)
          ---------------------------------------------------- */}
      {activeTab === 'training' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="flex-between">
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>ESG Training Compliance Center</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginTop: '0.25rem' }}>
                Complete accredited ESG training courses to improve organizational score index, and earn **+50 Points / +50 XP** for each.
              </p>
            </div>
            {isOfficerOrManager && !showCourseForm && (
              <button className="btn btn-env" onClick={() => setShowCourseForm(true)}>
                ➕ Announce Course
              </button>
            )}
          </div>

          {/* Create Training Course Form */}
          {showCourseForm && isOfficerOrManager && (
            <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-env)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Announce Training & Policy Education Course</h3>
              <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Course Title</label>
                    <input type="text" className="form-input" placeholder="e.g. Circular Economy Principles" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Accredited Hours</label>
                    <input type="number" className="form-input" placeholder="e.g. 2.5" value={courseHours} onChange={(e) => setCourseHours(e.target.value)} step="0.1" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description / Syllabus Scope</label>
                  <textarea className="form-textarea" rows={3} placeholder="Describe the topics covered in this training program..." value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCourseForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-env" disabled={submitting}>Announce Course</button>
                </div>
              </form>
            </div>
          )}

          {/* Courses List */}
          <div className="grid-cols-3" style={{ gap: '1rem' }}>
            {courses.map((course) => {
              const isCompleted = trainingCompletions.some(
                (tc) => tc.courseId === course.id && tc.employeeId === currentUser?.employeeId
              );

              return (
                <div key={course.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '220px', borderLeft: isCompleted ? '4px solid #10b981' : undefined }}>
                  <div className="flex-between">
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⏱️ {course.hours.toFixed(1)} Credit Hours</span>
                    {isCompleted && (
                      <span className="pill pill-success" style={{ fontSize: '0.6rem' }}>COMPLETED</span>
                    )}
                  </div>
                  
                  <h4 style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.5rem' }}>{course.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', flexGrow: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                    {course.description || 'No course syllabus described.'}
                  </p>

                  <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                    {isCompleted ? (
                      <button className="btn" style={{ width: '100%', background: 'rgba(16,185,129,0.06)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.75rem', cursor: 'default' }} disabled>
                        ✓ Certified Complete
                      </button>
                    ) : (
                      <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.75rem' }} onClick={() => handleCompleteTraining(course.id)} disabled={submitting}>
                        🎓 Mark as Completed (+50 XP/Points)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completions Registry History */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Employee Training Completion registry</h3>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date Certified</th>
                    <th>Employee Name</th>
                    <th>Department</th>
                    <th>Training Program Course Title</th>
                    <th>Accredited Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingCompletions.map((tc) => (
                    <tr key={tc.id}>
                      <td style={{ fontSize: '0.85rem' }}>{formatDate(tc.completedAt)}</td>
                      <td style={{ fontWeight: 600 }}>{tc.employee.name}</td>
                      <td>{tc.employee.department.name}</td>
                      <td>{tc.course.title}</td>
                      <td style={{ fontWeight: 600 }}>{tc.course.hours.toFixed(1)} hrs</td>
                    </tr>
                  ))}
                  {trainingCompletions.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                        No training certifications logged in company registry database.
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
