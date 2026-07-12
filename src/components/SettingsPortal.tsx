'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Config {
  autoEmissionCalc: boolean;
  evidenceRequired: boolean;
  badgeAutoAward: boolean;
  complianceEmailAlert: boolean;
  envWeight: number;
  socialWeight: number;
  govWeight: number;
  notifyCompliance: boolean;
  notifyApproval: boolean;
  notifyPolicyReminder: boolean;
  notifyBadgeUnlock: boolean;
}

interface Department {
  id: string;
  name: string;
  code: string;
  headName: string | null;
  employeeCount: number;
  carbonTarget: number;
  status: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface SettingsPortalProps {
  config: Config;
  departments: Department[];
  categories: Category[];
  currentUser: {
    role: string;
  } | null;
}

export default function SettingsPortal({
  config,
  departments,
  categories,
  currentUser,
}: SettingsPortalProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Right column active Tab: "depts" | "cats"
  const [activeTab, setActiveTab] = useState<'depts' | 'cats'>('depts');

  // Config fields
  const [autoEmissionCalc, setAutoEmissionCalc] = useState(config.autoEmissionCalc);
  const [evidenceRequired, setEvidenceRequired] = useState(config.evidenceRequired);
  const [badgeAutoAward, setBadgeAutoAward] = useState(config.badgeAutoAward);
  const [complianceEmailAlert, setComplianceEmailAlert] = useState(config.complianceEmailAlert);
  const [notifyCompliance, setNotifyCompliance] = useState(config.notifyCompliance);
  const [notifyApproval, setNotifyApproval] = useState(config.notifyApproval);
  const [notifyPolicyReminder, setNotifyPolicyReminder] = useState(config.notifyPolicyReminder);
  const [notifyBadgeUnlock, setNotifyBadgeUnlock] = useState(config.notifyBadgeUnlock);
  
  const [envWeight, setEnvWeight] = useState(config.envWeight * 100);
  const [socialWeight, setSocialWeight] = useState(config.socialWeight * 100);
  const [govWeight, setGovWeight] = useState(config.govWeight * 100);

  // Modal / Form state for edit/create
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  
  // Department form fields
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptHead, setDeptHead] = useState('');
  const [deptEmployeeCount, setDeptEmployeeCount] = useState(1);
  const [deptCarbonTarget, setDeptCarbonTarget] = useState(10.0);
  const [deptStatus, setDeptStatus] = useState('active');

  // Category form fields
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState('CSR');
  const [catStatus, setCatStatus] = useState('active');

  const isOfficerOrManager = currentUser && (currentUser.role === 'officer' || currentUser.role === 'manager');

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.round(envWeight + socialWeight + govWeight) !== 100) {
      setErrorMessage('ESG Weights must total exactly 100%.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoEmissionCalc,
          evidenceRequired,
          badgeAutoAward,
          complianceEmailAlert,
          envWeight: envWeight / 100,
          socialWeight: socialWeight / 100,
          govWeight: govWeight / 100,
          notifyCompliance,
          notifyApproval,
          notifyPolicyReminder,
          notifyBadgeUnlock,
        }),
      });

      if (res.ok) {
        setSuccessMessage('Global ESG configuration updated successfully!');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to update configuration.');
      }
    } catch {
      setErrorMessage('Unexpected error updating configuration.');
    } finally {
      setSubmitting(false);
    }
  };

  // Department CRUD Actions
  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    let errors: Record<string, string> = {};
    if (!deptName.trim()) errors.deptName = 'Name is required';
    if (!deptCode.trim()) errors.deptCode = 'Code is required';
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage('Please fix the highlighted errors.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const url = '/api/departments';
    const method = editingDeptId ? 'PUT' : 'POST';
    const body = {
      id: editingDeptId,
      name: deptName,
      code: deptCode,
      headName: deptHead,
      employeeCount: deptEmployeeCount,
      carbonTarget: deptCarbonTarget,
      status: deptStatus,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccessMessage(editingDeptId ? 'Department updated successfully!' : 'New Department created!');
        resetDeptForm();
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to save department.');
      }
    } catch {
      setErrorMessage('Error saving department details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDeptClick = (dept: Department) => {
    setEditingDeptId(dept.id);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptHead(dept.headName || '');
    setDeptEmployeeCount(dept.employeeCount);
    setDeptCarbonTarget(dept.carbonTarget);
    setDeptStatus(dept.status);
    setShowDeptForm(true);
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department? This will delete all carbon data and employees in this department.')) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/departments?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccessMessage('Department deleted successfully.');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to delete department.');
      }
    } catch {
      setErrorMessage('Error deleting department.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetDeptForm = () => {
    setEditingDeptId(null);
    setDeptName('');
    setDeptCode('');
    setDeptHead('');
    setDeptEmployeeCount(1);
    setDeptCarbonTarget(10.0);
    setDeptStatus('active');
    setShowDeptForm(false);
  };

  // Category CRUD Actions
  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    let errors: Record<string, string> = {};
    if (!catName.trim()) errors.catName = 'Name is required';
    if (!catType.trim()) errors.catType = 'Type is required';
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage('Please fix the highlighted errors.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const url = '/api/categories';
    const method = editingCatId ? 'PUT' : 'POST';
    const body = {
      id: editingCatId,
      name: catName,
      type: catType,
      status: catStatus,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccessMessage(editingCatId ? 'Category updated successfully!' : 'New Category created!');
        resetCatForm();
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to save category.');
      }
    } catch {
      setErrorMessage('Error saving category details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCatClick = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatStatus(cat.status);
    setShowCatForm(true);
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This will detach the category from CSR Activities and Challenges.')) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccessMessage('Category deleted successfully.');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to delete category.');
      }
    } catch {
      setErrorMessage('Error deleting category.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCatForm = () => {
    setEditingCatId(null);
    setCatName('');
    setCatType('CSR');
    setCatStatus('active');
    setShowCatForm(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Alert Banners */}
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

      <div className="grid-cols-3" style={{ alignItems: 'flex-start' }}>
        {/* Left Side: Configurations Forms (Toggles) */}
        <div className="glass-card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>EcoSphere Settings & Business Rules</h3>
          
          <form onSubmit={handleUpdateConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Toggle 1: Auto Emission Calc */}
              <div className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem' }}>Enable Automated Emission Calculation</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automatically fetch and calculate carbon emissions from ERP daily log records.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={autoEmissionCalc} 
                  onChange={(e) => setAutoEmissionCalc(e.target.checked)}
                  disabled={!isOfficerOrManager}
                  style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
                />
              </div>

              {/* Toggle 2: CSR Evidence requirement */}
              <div className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem' }}>Enforce Evidence Requirement for CSR Approvals</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Employees must attach a proof URL or upload receipt document to register participations.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={evidenceRequired} 
                  onChange={(e) => setEvidenceRequired(e.target.checked)}
                  disabled={!isOfficerOrManager}
                  style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
                />
              </div>

              {/* Toggle 3: Auto Award Badges */}
              <div className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem' }}>Automated Badge Distribution</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tally XP progress and automatically assign awards when thresholds are reached.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={badgeAutoAward} 
                  onChange={(e) => setBadgeAutoAward(e.target.checked)}
                  disabled={!isOfficerOrManager}
                  style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
                />
              </div>

              {/* Toggle 4: Compliance Email alert */}
              <div className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem' }}>Overdue Compliance Email Notifications</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email/Toast managers when compliance tickets surpass their resolution due dates.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={complianceEmailAlert} 
                  onChange={(e) => setComplianceEmailAlert(e.target.checked)}
                  disabled={!isOfficerOrManager}
                  style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
                />
              </div>

              {/* Toggle 5: Notify Compliance Created */}
              <div className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem' }}>Notify on New Compliance Issues</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Send in-app alerts as soon as a new compliance issue or audit violation is raised.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifyCompliance} 
                  onChange={(e) => setNotifyCompliance(e.target.checked)}
                  disabled={!isOfficerOrManager}
                  style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
                />
              </div>

              {/* Toggle 6: Notify Approvals */}
              <div className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem' }}>Notify on CSR/Challenge Approval Decisions</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alert employees when their activity logs are approved or rejected by managers.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifyApproval} 
                  onChange={(e) => setNotifyApproval(e.target.checked)}
                  disabled={!isOfficerOrManager}
                  style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
                />
              </div>

              {/* Toggle 7: Notify Policy Reminders */}
              <div className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem' }}>Notify Policy Acknowledgement Reminders</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Regularly trigger reminders for unsigned policies and ethical conduct codes.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifyPolicyReminder} 
                  onChange={(e) => setNotifyPolicyReminder(e.target.checked)}
                  disabled={!isOfficerOrManager}
                  style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
                />
              </div>

              {/* Toggle 8: Notify Badge Unlocks */}
              <div className="flex-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem' }}>Notify on Achievement Badge Unlocks</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Celebrate and send success alerts the moment an employee satisfies badge milestones.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={notifyBadgeUnlock} 
                  onChange={(e) => setNotifyBadgeUnlock(e.target.checked)}
                  disabled={!isOfficerOrManager}
                  style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Score Weight Configurations */}
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Configure ESG Scoring Weight Distribution</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Adjust index weights based on corporate sustainability targets. (Sum must equal 100%)
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Environmental Weight */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div className="flex-between">
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Environmental Weight</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-env)' }}>{envWeight}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={envWeight} 
                    onChange={(e) => setEnvWeight(parseInt(e.target.value))}
                    disabled={!isOfficerOrManager}
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-env)' }}
                  />
                </div>

                {/* Social Weight */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div className="flex-between">
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Social Weight</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818cf8' }}>{socialWeight}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={socialWeight} 
                    onChange={(e) => setSocialWeight(parseInt(e.target.value))}
                    disabled={!isOfficerOrManager}
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-social)' }}
                  />
                </div>

                {/* Governance Weight */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div className="flex-between">
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Governance Weight</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gov)' }}>{govWeight}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={govWeight} 
                    onChange={(e) => setGovWeight(parseInt(e.target.value))}
                    disabled={!isOfficerOrManager}
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-gov)' }}
                  />
                </div>

                <div className="flex-between" style={{ fontSize: '0.85rem', fontWeight: 700, borderTop: '1px solid var(--border-glow)', paddingTop: '0.5rem' }}>
                  <span>Total Weight Tally</span>
                  <span style={{ color: Math.round(envWeight + socialWeight + govWeight) === 100 ? 'var(--accent-env)' : '#ef4444' }}>
                    {Math.round(envWeight + socialWeight + govWeight)}%
                  </span>
                </div>
              </div>
            </div>

            {isOfficerOrManager && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-env" disabled={submitting}>
                  {submitting ? 'Saving...' : '💾 Save Configurations'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right Side: Tab Switcher (Departments vs Categories) */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-glow)', paddingBottom: '0.5rem' }}>
            <button 
              className="btn" 
              style={{ flexGrow: 1, padding: '0.4rem', fontSize: '0.85rem', background: activeTab === 'depts' ? 'rgba(255,255,255,0.06)' : 'transparent' }}
              onClick={() => setActiveTab('depts')}
            >
              Departments
            </button>
            <button 
              className="btn" 
              style={{ flexGrow: 1, padding: '0.4rem', fontSize: '0.85rem', background: activeTab === 'cats' ? 'rgba(255,255,255,0.06)' : 'transparent' }}
              onClick={() => setActiveTab('cats')}
            >
              Categories
            </button>
          </div>

          {/* DEPARTMENTS TAB VIEW */}
          {activeTab === 'depts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="flex-between">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Business Units</span>
                {isOfficerOrManager && !showDeptForm && (
                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setShowDeptForm(true)}>
                    ➕ New
                  </button>
                )}
              </div>

              {/* Department Form (Create or Edit) */}
              {showDeptForm && isOfficerOrManager && (
                <form onSubmit={handleSaveDept} style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-glow)', padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <h4 style={{ fontSize: '0.85rem' }}>{editingDeptId ? '✏️ Edit Department' : '➕ Create Department'}</h4>
                  <input type="text" className={`form-input ${fieldErrors.deptName ? 'input-error' : ''}`} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} placeholder="Name (e.g. Sales)" value={deptName} onChange={(e) => setDeptName(e.target.value)} required />
                  <input type="text" className={`form-input ${fieldErrors.deptCode ? 'input-error' : ''}`} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} placeholder="Code (e.g. SLS)" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} required />
                  <input type="text" className="form-input" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} placeholder="Head Name" value={deptHead} onChange={(e) => setDeptHead(e.target.value)} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="number" className="form-input" style={{ flexGrow: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} placeholder="Staff Count" value={deptEmployeeCount} onChange={(e) => setDeptEmployeeCount(parseInt(e.target.value) || 0)} min="0" />
                    <input type="number" step="0.1" className="form-input" style={{ flexGrow: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} placeholder="Carbon Target (tons)" value={deptCarbonTarget} onChange={(e) => setDeptCarbonTarget(parseFloat(e.target.value) || 0)} min="0" />
                    <select className="form-select" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} value={deptStatus} onChange={(e) => setDeptStatus(e.target.value)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={resetDeptForm}>Cancel</button>
                    <button type="submit" className="btn btn-env" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} disabled={submitting}>Save</button>
                  </div>
                </form>
              )}

              {/* Department List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {departments.map((dept) => (
                  <div key={dept.id} style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{dept.name}</span>
                        <span className="pill pill-success" style={{ fontSize: '0.55rem', padding: '0.05rem 0.35rem' }}>{dept.code}</span>
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Head: {dept.headName || 'N/A'} | Staff: {dept.employeeCount} | Target: {dept.carbonTarget} t CO2e
                      </div>
                    </div>
                    {isOfficerOrManager && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => handleEditDeptClick(dept)}>
                          ✏️
                        </button>
                        <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => handleDeleteDept(dept.id)}>
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORIES TAB VIEW */}
          {activeTab === 'cats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="flex-between">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Classification Tags</span>
                {isOfficerOrManager && !showCatForm && (
                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setShowCatForm(true)}>
                    ➕ New
                  </button>
                )}
              </div>

              {/* Category Form */}
              {showCatForm && isOfficerOrManager && (
                <form onSubmit={handleSaveCat} style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-glow)', padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <h4 style={{ fontSize: '0.85rem' }}>{editingCatId ? '✏️ Edit Category' : '➕ Create Category'}</h4>
                  <input type="text" className={`form-input ${fieldErrors.catName ? 'input-error' : ''}`} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} placeholder="Category Name" value={catName} onChange={(e) => setCatName(e.target.value)} required />
                  <select className={`form-select ${fieldErrors.catType ? 'input-error' : ''}`} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} value={catType} onChange={(e) => setCatType(e.target.value)}>
                    <option value="CSR">CSR Initiative</option>
                    <option value="CHALLENGE">Gamified Challenge</option>
                  </select>
                  <select className="form-select" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} value={catStatus} onChange={(e) => setCatStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={resetCatForm}>Cancel</button>
                    <button type="submit" className="btn btn-env" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} disabled={submitting}>Save</button>
                  </div>
                </form>
              )}

              {/* Categories List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {categories.map((cat) => (
                  <div key={cat.id} style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flexGrow: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{cat.name}</span>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Module: <span style={{ color: 'var(--accent-overall)', fontWeight: 600 }}>{cat.type}</span> | Status: {cat.status}
                      </div>
                    </div>
                    {isOfficerOrManager && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => handleEditCatClick(cat)}>
                          ✏️
                        </button>
                        <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => handleDeleteCat(cat.id)}>
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {categories.length === 0 && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    No categories created yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
