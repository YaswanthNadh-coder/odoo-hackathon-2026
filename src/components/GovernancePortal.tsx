'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatDate } from '@/lib/date';

interface Policy {
  id: string;
  title: string;
  body: string | null;
  acknowledgements: {
    id: string;
  }[];
}

interface ComplianceIssue {
  id: string;
  severity: string;
  description: string;
  owner: string;
  dueDate: string;
  status: string;
  auditId: string | null;
  audit: {
    title: string;
  } | null;
  department: {
    name: string;
    code: string;
  };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Audit {
  id: string;
  title: string;
  departmentId: string;
  auditorName: string;
  auditDate: string;
  status: string;
  score: number | null;
  findings: string | null;
  department: {
    name: string;
    code: string;
  };
  complianceIssues: {
    id: string;
    description: string;
    status: string;
  }[];
}

interface GovernancePortalProps {
  policies: Policy[];
  issues: ComplianceIssue[];
  departments: Department[];
  audits: Audit[];
  currentUser: {
    employeeId: string;
    name: string;
    role: string;
    departmentId: string;
    departmentCode: string;
  } | null;
}

export default function GovernancePortal({
  policies,
  issues,
  departments,
  audits,
  currentUser,
}: GovernancePortalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'policies' | 'audits' | 'issues'>('policies');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ----------------------------------------------------
  // POLICIES STATE & HANDLERS
  // ----------------------------------------------------
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [policyTitle, setPolicyTitle] = useState('');
  const [policyBody, setPolicyBody] = useState('');

  const handleAcknowledge = async (policyId: string) => {
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/governance/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Policy sign-off recorded successfully!');
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to acknowledge policy.');
      }
    } catch {
      setErrorMessage('Unexpected error during policy sign-off.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyTitle) {
      setErrorMessage('Policy title is required.');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-policy',
          title: policyTitle,
          body: policyBody,
        }),
      });

      if (res.ok) {
        setSuccessMessage('New ESG Policy created successfully!');
        setPolicyTitle('');
        setPolicyBody('');
        setShowPolicyForm(false);
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to create policy.');
      }
    } catch {
      setErrorMessage('Error creating policy.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) {
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/governance?type=policy&id=${policyId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccessMessage('ESG Policy deleted successfully.');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to delete policy.');
      }
    } catch {
      setErrorMessage('Error deleting policy.');
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // AUDITS STATE & HANDLERS
  // ----------------------------------------------------
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [editingAuditId, setEditingAuditId] = useState<string | null>(null);
  const [auditTitle, setAuditTitle] = useState('');
  const [auditDeptId, setAuditDeptId] = useState(departments[0]?.id || '');
  const [auditorName, setAuditorName] = useState('');
  const [auditDate, setAuditDate] = useState('');
  const [auditStatus, setAuditStatus] = useState('planned');
  const [auditScore, setAuditScore] = useState('');
  const [auditFindings, setAuditFindings] = useState('');

  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditTitle || !auditDeptId || !auditorName || !auditDate) {
      setErrorMessage('Please fill in title, department, auditor, and date.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const url = '/api/governance/audits';
    const method = editingAuditId ? 'PUT' : 'POST';
    const body = {
      id: editingAuditId,
      title: auditTitle,
      departmentId: auditDeptId,
      auditorName,
      auditDate,
      status: auditStatus,
      score: auditScore !== '' ? parseInt(auditScore) : null,
      findings: auditFindings,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccessMessage(editingAuditId ? 'Governance audit updated successfully!' : 'New Governance audit announced!');
        resetAuditForm();
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to save audit.');
      }
    } catch (err) {
      setErrorMessage('Error saving audit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAuditClick = (a: Audit) => {
    setEditingAuditId(a.id);
    setAuditTitle(a.title);
    setAuditDeptId(a.departmentId);
    setAuditorName(a.auditorName);
    setAuditDate(a.auditDate.split('T')[0]);
    setAuditStatus(a.status);
    setAuditScore(a.score !== null ? a.score.toString() : '');
    setAuditFindings(a.findings || '');
    setShowAuditForm(true);
  };

  const handleDeleteAudit = async (id: string) => {
    if (!confirm('Are you sure you want to delete this audit? Associated compliance issues will be unlinked.')) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/governance/audits?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccessMessage('Governance audit deleted successfully.');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to delete audit.');
      }
    } catch (err) {
      setErrorMessage('Error deleting audit.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAuditForm = () => {
    setEditingAuditId(null);
    setAuditTitle('');
    setAuditDeptId(departments[0]?.id || '');
    setAuditorName('');
    setAuditDate('');
    setAuditStatus('planned');
    setAuditScore('');
    setAuditFindings('');
    setShowAuditForm(false);
  };

  // ----------------------------------------------------
  // COMPLIANCE ISSUES STATE & HANDLERS
  // ----------------------------------------------------
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState(departments[0]?.id || '');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [linkedAuditId, setLinkedAuditId] = useState('');

  const handleRaiseIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !owner || !dueDate) {
      setErrorMessage('Please fill in all compliance issue fields.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-issue',
          departmentId: selectedDeptId,
          severity,
          description,
          owner,
          dueDate,
          auditId: linkedAuditId !== '' ? linkedAuditId : null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('New Compliance Issue logged successfully!');
        setDescription('');
        setOwner('');
        setDueDate('');
        setLinkedAuditId('');
        setShowIssueForm(false);
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to raise compliance issue.');
      }
    } catch {
      setErrorMessage('Unexpected error raising compliance issue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveIssue = async (issueId: string) => {
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve-issue',
          issueId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Compliance issue status updated to RESOLVED.');
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to resolve compliance issue.');
      }
    } catch {
      setErrorMessage('Unexpected error resolving compliance issue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm('Are you sure you want to delete this compliance issue?')) {
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/governance?type=issue&id=${issueId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccessMessage('Compliance issue deleted successfully.');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to delete compliance issue.');
      }
    } catch {
      setErrorMessage('Error deleting compliance issue.');
    } finally {
      setSubmitting(false);
    }
  };

  const isOfficerOrManager = currentUser && (currentUser.role === 'officer' || currentUser.role === 'manager');
  const now = new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Messages */}
      {errorMessage && (
        <div className="pill pill-error" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', textTransform: 'none', justifyContent: 'flex-start' }}>
          ⚠️ {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="pill pill-success" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', textTransform: 'none', justifyContent: 'flex-start' }}>
          ✅ {successMessage}
        </div>
      )}

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'policies' ? 'btn-env' : 'btn-secondary'}`}
          onClick={() => setActiveTab('policies')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          📜 Corporate Policies
        </button>
        <button
          className={`btn ${activeTab === 'audits' ? 'btn-env' : 'btn-secondary'}`}
          onClick={() => setActiveTab('audits')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          ⚖️ Governance Audits
        </button>
        <button
          className={`btn ${activeTab === 'issues' ? 'btn-env' : 'btn-secondary'}`}
          onClick={() => setActiveTab('issues')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          🛡️ Compliance Issues
        </button>
      </div>

      {/* ----------------------------------------------------
          TAB 1: CORPORATE POLICIES
          ---------------------------------------------------- */}
      {activeTab === 'policies' && (
        <div>
          <div className="flex-between mb-6">
            <h3 style={{ fontSize: '1.25rem' }}>📜 ESG Corporate Policy Sign-Offs</h3>
            {isOfficerOrManager && (
              <button className="btn btn-env" onClick={() => setShowPolicyForm(!showPolicyForm)}>
                {showPolicyForm ? '✕ Close Form' : '➕ Create ESG Policy'}
              </button>
            )}
          </div>

          {/* Create Policy Form */}
          {showPolicyForm && isOfficerOrManager && (
            <div className="glass-card mb-6" style={{ borderLeft: '4px solid var(--accent-overall)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Establish New Corporate ESG Policy</h3>
              <form onSubmit={handleCreatePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Policy Title</label>
                  <input type="text" className="form-input" placeholder="e.g. Carbon Offset Investment Protocol" value={policyTitle} onChange={(e) => setPolicyTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Policy Body / Directives</label>
                  <textarea className="form-textarea" rows={4} placeholder="Detail the policies standards..." value={policyBody} onChange={(e) => setPolicyBody(e.target.value)} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPolicyForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-env" disabled={submitting}>💾 Publish Policy</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid-cols-2">
            {policies.map((policy) => {
              const isSigned = policy.acknowledgements && policy.acknowledgements.length > 0;
              return (
                <div key={policy.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{policy.title}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isSigned ? (
                        <span className="pill pill-success" style={{ fontSize: '0.65rem' }}>✓ Signed</span>
                      ) : (
                        <span className="pill pill-warning" style={{ fontSize: '0.65rem' }}>⚠ Required</span>
                      )}
                      {isOfficerOrManager && (
                        <button className="btn" style={{ padding: '0.2rem', background: 'transparent' }} onClick={() => handleDeletePolicy(policy.id)}>
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', flexGrow: 1, lineHeight: '1.4' }}>
                    {policy.body}
                  </p>
                  <div style={{ marginTop: '1rem' }}>
                    {isSigned ? (
                      <button className="btn btn-secondary" style={{ width: '100%', padding: '0.5rem', opacity: 0.6 }} disabled>
                        ✓ Signed Acknowledged
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.5rem' }}
                        onClick={() => handleAcknowledge(policy.id)}
                        disabled={submitting}
                      >
                        Acknowledge & Sign Policy
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 2: GOVERNANCE AUDITS (New feature)
          ---------------------------------------------------- */}
      {activeTab === 'audits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="flex-between">
            <h3 style={{ fontSize: '1.25rem' }}>📋 Corporate Compliance Audits</h3>
            {isOfficerOrManager && !showAuditForm && (
              <button className="btn btn-env" onClick={() => setShowAuditForm(true)}>
                ➕ Create Audit Record
              </button>
            )}
          </div>

          {/* Create/Edit Audit Form */}
          {showAuditForm && isOfficerOrManager && (
            <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-env)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
                {editingAuditId ? '✏️ Edit Governance Audit' : '➕ Register Compliance Audit'}
              </h3>
              <form onSubmit={handleSaveAudit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Audit Title</label>
                    <input type="text" className="form-input" placeholder="e.g. Q3 Facility Emissions Audit" value={auditTitle} onChange={(e) => setAuditTitle(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Audited Department</label>
                    <select className="form-select" value={auditDeptId} onChange={(e) => setAuditDeptId(e.target.value)}>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Auditor Name / Agency</label>
                    <input type="text" className="form-input" placeholder="e.g. Ernst & Green Co." value={auditorName} onChange={(e) => setAuditorName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Audit Date</label>
                    <input type="date" className="form-input" value={auditDate} onChange={(e) => setAuditDate(e.target.value)} required />
                  </div>
                </div>

                <div className="grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Audit Status</label>
                    <select className="form-select" value={auditStatus} onChange={(e) => setAuditStatus(e.target.value)}>
                      <option value="planned">Planned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed (Passed)</option>
                      <option value="failed">Failed Compliance</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Audit Score (0 - 100, optional)</label>
                    <input type="number" className="form-input" placeholder="e.g. 92" min="0" max="100" value={auditScore} onChange={(e) => setAuditScore(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Audit Findings & Notes</label>
                  <textarea className="form-textarea" rows={3} placeholder="Syllabus, notes and structural warnings discovered during the audit process..." value={auditFindings} onChange={(e) => setAuditFindings(e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={resetAuditForm}>Cancel</button>
                  <button type="submit" className="btn btn-env" disabled={submitting}>💾 Save Audit</button>
                </div>
              </form>
            </div>
          )}

          {/* Audits Table */}
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Audit Name</th>
                  <th>Department</th>
                  <th>Auditor</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Associated Issues</th>
                  {isOfficerOrManager && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => {
                  let statusColor = 'pill-warning';
                  if (a.status === 'completed') statusColor = 'pill-success';
                  if (a.status === 'failed') statusColor = 'pill-error';
                  if (a.status === 'planned') statusColor = 'pill-info';

                  const openIssuesCount = a.complianceIssues.filter(ci => ci.status === 'open').length;

                  return (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{a.title}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '0.15rem' }}>{a.findings || 'No notes.'}</span>
                        </div>
                      </td>
                      <td>{a.department.name}</td>
                      <td>{a.auditorName}</td>
                      <td>{formatDate(a.auditDate)}</td>
                      <td>
                        <span className={`pill ${statusColor}`} style={{ fontSize: '0.65rem' }}>
                          {a.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{a.score !== null ? `${a.score}/100` : 'N/A'}</td>
                      <td>
                        {a.complianceIssues.length > 0 ? (
                          <span className={`pill ${openIssuesCount > 0 ? 'pill-error' : 'pill-success'}`} style={{ fontSize: '0.65rem' }}>
                            {openIssuesCount} open / {a.complianceIssues.length} total
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                        )}
                      </td>
                      {isOfficerOrManager && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn" style={{ padding: '0.2rem', background: 'transparent' }} onClick={() => handleEditAuditClick(a)}>
                              ✏️
                            </button>
                            <button className="btn" style={{ padding: '0.2rem', background: 'transparent' }} onClick={() => handleDeleteAudit(a.id)}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {audits.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                      No audits recorded in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 3: COMPLIANCE ISSUES
          ---------------------------------------------------- */}
      {activeTab === 'issues' && (
        <div>
          <div className="flex-between mb-6">
            <h3 style={{ fontSize: '1.25rem' }}>🛡️ Compliance Violations & Warnings</h3>
            {isOfficerOrManager && (
              <button className="btn btn-env" onClick={() => setShowIssueForm(!showIssueForm)}>
                {showIssueForm ? '✕ Close Form' : '➕ Raise Compliance Issue'}
              </button>
            )}
          </div>

          {/* Raise Issue Form */}
          {showIssueForm && (
            <div className="glass-card mb-6" style={{ borderLeft: '4px solid var(--accent-gov)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Report Environmental/Compliance Issue</h3>
              <form onSubmit={handleRaiseIssue} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="grid-cols-3" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Responsible Department</label>
                    <select
                      className="form-select"
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                    >
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Severity Level</label>
                    <select className="form-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                      <option value="low">Low Impact</option>
                      <option value="medium">Medium Impact</option>
                      <option value="high">High Threat</option>
                      <option value="critical">Critical Compliance Warning</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assigned Owner Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Robert Chen"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid-cols-3" style={{ gap: '1rem' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Description of Violation</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Describe the issue..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Due Date for Resolution</label>
                    <input
                      type="date"
                      className="form-input"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Associate with Compliance Audit (Optional)</label>
                  <select
                    className="form-select"
                    value={linkedAuditId}
                    onChange={(e) => setLinkedAuditId(e.target.value)}
                  >
                    <option value="">None (Independent Compliance Issue)</option>
                    {audits.map((a) => (
                      <option key={a.id} value={a.id}>{a.title} ({a.department.code})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-env" disabled={submitting}>
                    {submitting ? 'Submitting...' : '💾 Save Issue to Audit Log'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Compliance Issues Ledger */}
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Scope Dept</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>Linked Audit</th>
                  <th>Owner Assigned</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => {
                  const isOverdue = issue.status === 'open' && new Date(issue.dueDate) < now;
                  
                  let severityColor = 'pill-info';
                  if (issue.severity === 'critical') severityColor = 'pill-error';
                  else if (issue.severity === 'high') severityColor = 'pill-error';
                  else if (issue.severity === 'medium') severityColor = 'pill-warning';

                  return (
                    <tr key={issue.id}>
                      <td style={{ fontWeight: 600 }}>{issue.department.name}</td>
                      <td>
                        <span className={`pill ${severityColor}`} style={{ fontSize: '0.65rem' }}>
                          {issue.severity.toUpperCase()}
                        </span>
                      </td>
                      <td>{issue.description}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {issue.audit ? issue.audit.title : <span style={{ color: 'var(--text-muted)' }}>None</span>}
                      </td>
                      <td style={{ fontWeight: 500 }}>{issue.owner}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span>{formatDate(issue.dueDate)}</span>
                          {isOverdue && (
                            <span className="pill pill-error" style={{ fontSize: '0.55rem', padding: '0.1rem 0.35rem', alignSelf: 'flex-start' }}>
                              ⏰ OVERDUE
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`pill ${issue.status === 'resolved' ? 'pill-success' : 'pill-warning'}`} style={{ fontSize: '0.65rem' }}>
                          {issue.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          {issue.status === 'open' && isOfficerOrManager && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderLeft: '3px solid var(--accent-env)' }}
                              onClick={() => handleResolveIssue(issue.id)}
                              disabled={submitting}
                            >
                              Resolve
                            </button>
                          )}
                          {isOfficerOrManager && (
                            <button
                              className="btn"
                              style={{ padding: '0.25rem', background: 'transparent' }}
                              onClick={() => handleDeleteIssue(issue.id)}
                              disabled={submitting}
                            >
                              🗑️
                            </button>
                          )}
                          {!isOfficerOrManager && issue.status === 'resolved' && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {issues.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                      🟢 No compliance issues recorded in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
