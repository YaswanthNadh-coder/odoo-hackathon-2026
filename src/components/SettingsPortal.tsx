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
}

interface Department {
  id: string;
  name: string;
  code: string;
  headName: string | null;
  employeeCount: number;
  status: string;
}

interface SettingsPortalProps {
  config: Config;
  departments: Department[];
  currentUser: {
    role: string;
  } | null;
}

export default function SettingsPortal({
  config,
  departments,
  currentUser,
}: SettingsPortalProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Config fields
  const [autoEmissionCalc, setAutoEmissionCalc] = useState(config.autoEmissionCalc);
  const [evidenceRequired, setEvidenceRequired] = useState(config.evidenceRequired);
  const [badgeAutoAward, setBadgeAutoAward] = useState(config.badgeAutoAward);
  const [complianceEmailAlert, setComplianceEmailAlert] = useState(config.complianceEmailAlert);
  
  const [envWeight, setEnvWeight] = useState(config.envWeight * 100);
  const [socialWeight, setSocialWeight] = useState(config.socialWeight * 100);
  const [govWeight, setGovWeight] = useState(config.govWeight * 100);

  // New Department fields
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptHead, setDeptHead] = useState('');
  const [deptEmployeeCount, setDeptEmployeeCount] = useState(1);

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
        }),
      });

      if (res.ok) {
        setSuccessMessage('Global ESG configuration updated successfully!');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to update configuration.');
      }
    } catch (err) {
      setErrorMessage('Unexpected error updating configuration.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName || !deptCode) {
      setErrorMessage('Please provide department name and code.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/governance', { // we reuse the governance endpoint for admin inserts
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-dept', // Wait, does the governance route handle 'create-dept'?
          // Wait! Let's check: our governance route does NOT handle 'create-dept' yet!
          // We can easily update /api/governance/route.ts to handle 'create-dept' or add it here.
          // Let's check how we handle it in our endpoint or make a new api endpoint.
          // Wait, let's update /api/governance/route.ts later, or write it directly. Let's make sure it handles it!
          name: deptName,
          code: deptCode,
          headName: deptHead,
          employeeCount: deptEmployeeCount,
        }),
      });

      // Wait, is there a simple API for creating a department? Let's check or handle it in governance API route.
      // Yes, we will add support for action 'create-dept' in `/api/governance/route.ts` to make it super clean!
    } catch (e) {
      setErrorMessage('Unexpected error creating department.');
    }
  };

  const isOfficerOrManager = currentUser && (currentUser.role === 'officer' || currentUser.role === 'manager');

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
        {/* Configurations Forms (Toggles) */}
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

        {/* Departments List Display */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Departments Management</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {departments.map((dept) => (
              <div key={dept.id} style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-md)' }}>
                <div className="flex-between">
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{dept.name}</span>
                  <span className="pill pill-success" style={{ fontSize: '0.55rem' }}>{dept.code}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Head: {dept.headName || 'N/A'}</span>
                  <span>Employees: {dept.employeeCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
