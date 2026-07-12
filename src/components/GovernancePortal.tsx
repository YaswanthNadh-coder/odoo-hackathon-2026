'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
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
  department: {
    name: string;
    code: string;
  };
}

interface Audit {
  id: string;
  title: string;
  description: string | null;
  auditor: string;
  date: string;
  status: string;
  findings: string | null;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface GovernancePortalProps {
  policies: Policy[];
  issues: ComplianceIssue[];
  audits: Audit[];
  departments: Department[];
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
  audits,
  departments,
  currentUser,
}: GovernancePortalProps) {
  const router = useRouter();

  // Polling for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 15000);
    return () => clearInterval(interval);
  }, [router]);

  const [submitting, setSubmitting] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Policy form fields
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [policyTitle, setPolicyTitle] = useState('');
  const [policyBody, setPolicyBody] = useState('');

  // Form Fields for reporting issue
  const [selectedDeptId, setSelectedDeptId] = useState(departments[0]?.id || '');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Audit form fields
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [editingAuditId, setEditingAuditId] = useState<string | null>(null);
  const [auditTitle, setAuditTitle] = useState('');
  const [auditDescription, setAuditDescription] = useState('');
  const [auditor, setAuditor] = useState('');
  const [auditDate, setAuditDate] = useState('');
  const [auditStatus, setAuditStatus] = useState('pending');
  const [auditFindings, setAuditFindings] = useState('');

  const isOfficerOrManager = currentUser && (currentUser.role === 'officer' || currentUser.role === 'manager');

  // Handle policy acknowledgement
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

  // Create or Edit Policy
  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyTitle) {
      setErrorMessage('Policy title is required.');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const url = '/api/governance';
    const method = editingPolicyId ? 'PUT' : 'POST';
    const body = editingPolicyId ? {
      id: editingPolicyId,
      title: policyTitle,
      body: policyBody,
    } : {
      action: 'create-policy',
      title: policyTitle,
      body: policyBody,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccessMessage(editingPolicyId ? 'ESG Policy updated successfully!' : 'New ESG Policy created successfully!');
        resetPolicyForm();
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to save policy.');
      }
    } catch {
      setErrorMessage('Error saving policy.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPolicyClick = (policy: Policy) => {
    setEditingPolicyId(policy.id);
    setPolicyTitle(policy.title);
    setPolicyBody(policy.body || '');
    setShowPolicyForm(true);
  };

  const resetPolicyForm = () => {
    setEditingPolicyId(null);
    setPolicyTitle('');
    setPolicyBody('');
    setShowPolicyForm(false);
  };

  // Delete Policy
  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy? This will also delete all acknowledgements logged under this policy.')) {
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

  // Handle raise compliance issue
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
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('New Compliance Issue logged successfully!');
        setDescription('');
        setOwner('');
        setDueDate('');
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

  // Handle resolve issue
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

  // Delete Compliance Issue
  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm('Are you sure you want to delete this compliance issue from the audit logs?')) {
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

  // Create or Edit Audit
  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditTitle || !auditor) {
      setErrorMessage('Title and Auditor are required.');
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
      description: auditDescription,
      auditor,
      date: auditDate ? new Date(auditDate) : undefined,
      status: auditStatus,
      findings: auditFindings,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccessMessage(editingAuditId ? 'Audit updated successfully!' : 'Audit logged successfully!');
        resetAuditForm();
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to save audit.');
      }
    } catch {
      setErrorMessage('Error saving audit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAuditClick = (audit: Audit) => {
    setEditingAuditId(audit.id);
    setAuditTitle(audit.title);
    setAuditDescription(audit.description || '');
    setAuditor(audit.auditor);
    setAuditDate(audit.date ? audit.date.substring(0, 10) : '');
    setAuditStatus(audit.status);
    setAuditFindings(audit.findings || '');
    setShowAuditForm(true);
  };

  const resetAuditForm = () => {
    setEditingAuditId(null);
    setAuditTitle('');
    setAuditDescription('');
    setAuditor('');
    setAuditDate('');
    setAuditStatus('pending');
    setAuditFindings('');
    setShowAuditForm(false);
  };

  // Delete Audit
  const handleDeleteAudit = async (auditId: string) => {
    if (!confirm('Are you sure you want to delete this audit record?')) return;
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/governance/audits?id=${auditId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMessage('Audit deleted successfully.');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to delete audit.');
      }
    } catch {
      setErrorMessage('Error deleting audit.');
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* Row 1: ESG Policies Sign-offs */}
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
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
              {editingPolicyId ? '✏️ Edit Corporate ESG Policy' : 'Establish New Corporate ESG Policy'}
            </h3>
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
                <button type="button" className="btn btn-secondary" onClick={resetPolicyForm}>Cancel</button>
                <button type="submit" className="btn btn-env" disabled={submitting}>
                  {editingPolicyId ? '💾 Save Changes' : '💾 Publish Policy'}
                </button>
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
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn" style={{ padding: '0.2rem', background: 'transparent' }} onClick={() => handleEditPolicyClick(policy)}>
                          ✏️
                        </button>
                        <button className="btn" style={{ padding: '0.2rem', background: 'transparent' }} onClick={() => handleDeletePolicy(policy.id)}>
                          🗑️
                        </button>
                      </div>
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

      {/* Row 2: Compliance Issues */}
      <div>
        <div className="flex-between mb-6">
          <h3 style={{ fontSize: '1.25rem' }}>🛡️ Compliance Auditing & Logged Issues</h3>
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

              <div className="grid-cols-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Description of Violation/Audit Findings</label>
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
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                    🟢 No compliance issues recorded in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3: Audits Ledger */}
      <div>
        <div className="flex-between mb-6">
          <h3 style={{ fontSize: '1.25rem' }}>📋 Company-Wide Audits Ledger</h3>
          {isOfficerOrManager && (
            <button className="btn btn-env" onClick={() => setShowAuditForm(!showAuditForm)}>
              {showAuditForm ? '✕ Close Form' : '➕ Log New Audit'}
            </button>
          )}
        </div>

        {/* Audit Form */}
        {showAuditForm && isOfficerOrManager && (
          <div className="glass-card mb-6" style={{ borderLeft: '4px solid var(--accent-social)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
              {editingAuditId ? '✏️ Edit Audit Record' : 'Log New External/Internal Audit'}
            </h3>
            <form onSubmit={handleSaveAudit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-cols-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Audit Title</label>
                  <input type="text" className="form-input" placeholder="e.g. Annual ISO 14001 Review" value={auditTitle} onChange={(e) => setAuditTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Auditor (Internal or Third-Party)</label>
                  <input type="text" className="form-input" placeholder="e.g. GreenShield Certifications" value={auditor} onChange={(e) => setAuditor(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description / Scope</label>
                <textarea className="form-textarea" rows={2} placeholder="Describe the scope of this audit..." value={auditDescription} onChange={(e) => setAuditDescription(e.target.value)} />
              </div>
              
              <div className="grid-cols-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={auditDate} onChange={(e) => setAuditDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={auditStatus} onChange={(e) => setAuditStatus(e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed / Non-Compliant</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Findings / Remarks</label>
                <textarea className="form-textarea" rows={3} placeholder="List key findings, non-conformities, or recommendations..." value={auditFindings} onChange={(e) => setAuditFindings(e.target.value)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={resetAuditForm}>Cancel</button>
                <button type="submit" className="btn btn-env" disabled={submitting}>
                  {editingAuditId ? '💾 Save Changes' : '💾 Log Audit'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Audits Table */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title & Scope</th>
                <th>Auditor</th>
                <th>Status</th>
                <th>Findings</th>
                {isOfficerOrManager && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => {
                let statusColor = 'pill-warning';
                if (audit.status === 'passed') statusColor = 'pill-success';
                else if (audit.status === 'failed') statusColor = 'pill-error';

                return (
                  <tr key={audit.id}>
                    <td style={{ fontSize: '0.85rem' }}>{formatDate(audit.date)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{audit.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{audit.description}</div>
                    </td>
                    <td>{audit.auditor}</td>
                    <td>
                      <span className={`pill ${statusColor}`} style={{ fontSize: '0.65rem' }}>
                        {audit.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{audit.findings || '-'}</td>
                    {isOfficerOrManager && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => handleEditAuditClick(audit)}>
                            ✏️
                          </button>
                          <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => handleDeleteAudit(audit.id)}>
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
                  <td colSpan={isOfficerOrManager ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                    📋 No audits logged yet.
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
