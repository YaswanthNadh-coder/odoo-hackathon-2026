'use client';

import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/date';

interface ScoreDetails {
  environmental: number;
  social: number;
  governance: number;
  total: number;
  carbonTotal: number;
  carbonTarget: number;
  participationsCount: number;
  totalXp: number;
  policyAckRate: number;
  overdueIssues: number;
}

interface DepartmentScore {
  id: string;
  name: string;
  code: string;
  employeeCount: number;
  headName: string | null;
  scores: ScoreDetails;
}

interface FilterOption {
  id: string;
  name?: string;
  code?: string;
  title?: string;
  type?: string;
}

interface ReportsPortalProps {
  departmentScores: DepartmentScore[];
  weights: {
    environmental: number;
    social: number;
    governance: number;
  };
  overallScores: {
    environmental: number;
    social: number;
    governance: number;
    overall: number;
  };
  departments: FilterOption[];
  employees: FilterOption[];
  challenges: FilterOption[];
  categories: FilterOption[];
}

export default function ReportsPortal({
  departmentScores,
  weights,
  overallScores,
  departments,
  employees,
  challenges,
  categories,
}: ReportsPortalProps) {
  // Navigation Tabs: 'summary' | 'custom'
  const [activeView, setActiveView] = useState<'summary' | 'custom'>('summary');
  
  // Preconfigured Report Selection (under Summary)
  const [preconfiguredReport, setPreconfiguredReport] = useState<'all' | 'env' | 'soc' | 'gov'>('all');

  // Custom Report Builder Filter states
  const [filterDept, setFilterDept] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterChallenge, setFilterChallenge] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Generated Report Data
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch custom report data
  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filterDept) queryParams.append('departmentId', filterDept);
      if (filterEmployee) queryParams.append('employeeId', filterEmployee);
      if (filterChallenge) queryParams.append('challengeId', filterChallenge);
      if (filterCategory) queryParams.append('categoryId', filterCategory);
      if (filterModule) queryParams.append('module', filterModule);
      if (filterStartDate) queryParams.append('startDate', filterStartDate);
      if (filterEndDate) queryParams.append('endDate', filterEndDate);

      const res = await fetch(`/api/reports?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        alert('Failed to generate custom report.');
      }
    } catch (err) {
      console.error(err);
      alert('Error building report.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger initial report load when entering custom builder
  useEffect(() => {
    if (activeView === 'custom') {
      handleGenerateReport();
    }
  }, [activeView]);

  // Export CSV/Excel spreadsheet helper
  const handleExportCSV = (dataToExport?: any) => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = 'EcoSphere_Report';

    if (activeView === 'summary') {
      filename = `EcoSphere_ESG_Summary_${preconfiguredReport.toUpperCase()}_${new Date().toISOString().split('T')[0]}`;
      
      if (preconfiguredReport === 'all') {
        headers = ['Dept Name', 'Dept Code', 'Staff', 'Actual CO2e (t)', 'CO2e Target (t)', 'Env Score', 'CSR Approvals', 'Social Score', 'Policy Sign-offs (%)', 'Overdue Issues', 'Gov Score', 'Overall Score'];
        rows = departmentScores.map(d => [d.name, d.code, d.employeeCount, d.scores.carbonTotal, d.scores.carbonTarget, d.scores.environmental, d.scores.participationsCount, d.scores.social, d.scores.policyAckRate, d.scores.overdueIssues, d.scores.governance, d.scores.total]);
      } else if (preconfiguredReport === 'env') {
        headers = ['Dept Name', 'Dept Code', 'Staff', 'Actual CO2e (t)', 'CO2e Target (t)', 'Env Score'];
        rows = departmentScores.map(d => [d.name, d.code, d.employeeCount, d.scores.carbonTotal, d.scores.carbonTarget, d.scores.environmental]);
      } else if (preconfiguredReport === 'soc') {
        headers = ['Dept Name', 'Dept Code', 'Staff', 'CSR Approvals', 'Total XP', 'Social Score'];
        rows = departmentScores.map(d => [d.name, d.code, d.employeeCount, d.scores.participationsCount, d.scores.totalXp, d.scores.social]);
      } else if (preconfiguredReport === 'gov') {
        headers = ['Dept Name', 'Dept Code', 'Staff', 'Policy Sign-offs (%)', 'Overdue Issues', 'Gov Score'];
        rows = departmentScores.map(d => [d.name, d.code, d.employeeCount, d.scores.policyAckRate, d.scores.overdueIssues, d.scores.governance]);
      }
    } else if (dataToExport) {
      filename = `EcoSphere_Custom_Report_${new Date().toISOString().split('T')[0]}`;
      headers = ['CategoryType', 'Reference/Activity', 'Department/Employee', 'Metric Value', 'CO2e/Points/Score', 'Status', 'Date Logged'];
      
      // Flatten custom report elements into a general CSV
      if (dataToExport.carbonTransactions?.length > 0) {
        dataToExport.carbonTransactions.forEach((tx: any) => {
          rows.push(['Carbon Account', tx.emissionFactor.name, tx.department.name, `${tx.quantity} ${tx.emissionFactor.unit}`, `${tx.co2eTotal} t CO2e`, tx.source, formatDate(tx.date)]);
        });
      }
      if (dataToExport.csrParticipations?.length > 0) {
        dataToExport.csrParticipations.forEach((p: any) => {
          rows.push(['CSR Activity', p.activity.title, p.employee.name, 'N/A', `+${p.pointsEarned} Points`, p.approvalStatus, p.completedAt ? formatDate(p.completedAt) : 'N/A']);
        });
      }
      if (dataToExport.trainingCompletions?.length > 0) {
        dataToExport.trainingCompletions.forEach((tc: any) => {
          rows.push(['ESG Training', tc.course.title, tc.employee.name, `${tc.course.hours} hrs`, '+50 Points/XP', 'COMPLETED', formatDate(tc.completedAt)]);
        });
      }
      if (dataToExport.complianceIssues?.length > 0) {
        dataToExport.complianceIssues.forEach((ci: any) => {
          rows.push(['Compliance Issue', ci.description, ci.department.name, `Severity: ${ci.severity}`, 'N/A', ci.status, formatDate(ci.dueDate)]);
        });
      }
      if (dataToExport.audits?.length > 0) {
        dataToExport.audits.forEach((au: any) => {
          rows.push(['Gov Audit', au.title, au.department.name, `Auditor: ${au.auditorName}`, au.score !== null ? `${au.score}/100` : 'N/A', au.status, formatDate(au.auditDate)]);
        });
      }
      if (dataToExport.rewardRedemptions?.length > 0) {
        dataToExport.rewardRedemptions.forEach((rr: any) => {
          rows.push(['Reward Redeem', rr.reward.name, rr.employee.name, 'N/A', `-${rr.pointsSpent} Points`, 'SUCCESS', formatDate(rr.redeemedAt)]);
        });
      }
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val !== undefined && val !== null ? val.toString().replace(/"/g, '""') : ''}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Browser Print optimized layout
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="print:p-0">
      {/* Top Selector Center */}
      <div className="glass-card flex-between print:hidden">
        <div>
          <h3 style={{ fontSize: '1.1rem' }}>ESG Reports & Audits Ledger</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
            Switch between pre-configured vertical index reports and custom queries.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${activeView === 'summary' ? 'btn-env' : 'btn-secondary'}`}
            onClick={() => setActiveView('summary')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
          >
            📊 Pre-configured Reports
          </button>
          <button
            className={`btn ${activeView === 'custom' ? 'btn-env' : 'btn-secondary'}`}
            onClick={() => setActiveView('custom')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
          >
            ⚙️ Custom Report Builder
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------
          SECTION 1: PRECONFIGURED REPORTS
          ---------------------------------------------------- */}
      {activeView === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* pre-configured report selector banner */}
          <div className="glass-card flex-between print:hidden" style={{ background: 'rgba(255,255,255,0.01)', borderStyle: 'dashed' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className={`btn ${preconfiguredReport === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPreconfiguredReport('all')} style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>Consolidated ESG Summary</button>
              <button className={`btn ${preconfiguredReport === 'env' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPreconfiguredReport('env')} style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>🍀 Environmental Report</button>
              <button className={`btn ${preconfiguredReport === 'soc' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPreconfiguredReport('soc')} style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>🤝 Social Report</button>
              <button className={`btn ${preconfiguredReport === 'gov' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPreconfiguredReport('gov')} style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>⚖️ Governance Report</button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => handleExportCSV()} style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>📥 Excel/CSV</button>
              <button className="btn btn-secondary" onClick={handlePrintPDF} style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>🖨️ PDF Print</button>
            </div>
          </div>

          {/* Consolidated KPI Score Overview Cards */}
          <div className="grid-cols-4 print:grid-cols-4 print:gap-4">
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Corporate Index E</span>
              <h2 style={{ color: 'var(--accent-env)', marginTop: '0.25rem' }}>{overallScores.environmental} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 100</span></h2>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Corporate Index S</span>
              <h2 style={{ color: 'var(--accent-social)', marginTop: '0.25rem' }}>{overallScores.social} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 100</span></h2>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Corporate Index G</span>
              <h2 style={{ color: 'var(--accent-gov)', marginTop: '0.25rem' }}>{overallScores.governance} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 100</span></h2>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(17,24,39,0.7), rgba(6,182,212,0.03))' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Consolidated ESG Index</span>
              <h2 style={{ color: 'var(--accent-overall)', marginTop: '0.25rem' }}>{overallScores.overall} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rating</span></h2>
            </div>
          </div>

          {/* Render Preconfigured tables based on selection */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }} className="print:text-black">
              {preconfiguredReport === 'all' && 'Consolidated ESG Summary Index'}
              {preconfiguredReport === 'env' && 'Environmental Auditing ledger (Carbon targets)'}
              {preconfiguredReport === 'soc' && 'Social Engagement Index (CSR Volunteering & XP)'}
              {preconfiguredReport === 'gov' && 'Governance Sign-offs & Resolution Rate'}
            </h3>
            
            <div className="table-container">
              <table className="custom-table print:text-black">
                <thead>
                  {preconfiguredReport === 'all' && (
                    <tr>
                      <th>Scope Dept</th>
                      <th>Staff</th>
                      <th>Carbon Footprint (Actual/Target)</th>
                      <th>Env Score</th>
                      <th>CSR Participations</th>
                      <th>Social Score</th>
                      <th>Policy Sign-Off</th>
                      <th>Audits Overdue</th>
                      <th>Gov Score</th>
                      <th>Overall Index</th>
                    </tr>
                  )}
                  {preconfiguredReport === 'env' && (
                    <tr>
                      <th>Scope Dept</th>
                      <th>Staff</th>
                      <th>Actual CO2e Emissions</th>
                      <th>Carbon Budget Target</th>
                      <th>Budget Utilized (%)</th>
                      <th>Environmental Rating Score</th>
                    </tr>
                  )}
                  {preconfiguredReport === 'soc' && (
                    <tr>
                      <th>Scope Dept</th>
                      <th>Staff</th>
                      <th>Approved CSR Volunteering</th>
                      <th>Total Experience Points (XP)</th>
                      <th>Social Rating Score</th>
                    </tr>
                  )}
                  {preconfiguredReport === 'gov' && (
                    <tr>
                      <th>Scope Dept</th>
                      <th>Staff</th>
                      <th>Corporate Policy Sign-Off Rate</th>
                      <th>Overdue Violations</th>
                      <th>Governance Rating Score</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {departmentScores.map((dept) => {
                    const carbonPercent = dept.scores.carbonTarget > 0 ? (dept.scores.carbonTotal / dept.scores.carbonTarget) * 100 : 0;
                    return (
                      <tr key={dept.id}>
                        <td style={{ fontWeight: 600 }}>{dept.name} ({dept.code})</td>
                        <td>{dept.employeeCount}</td>

                        {/* Consolidated overview details */}
                        {preconfiguredReport === 'all' && (
                          <>
                            <td style={{ fontWeight: 500 }}>{dept.scores.carbonTotal.toFixed(2)} / {dept.scores.carbonTarget.toFixed(2)} t</td>
                            <td style={{ color: 'var(--accent-env)', fontWeight: 600 }}>{dept.scores.environmental}</td>
                            <td>{dept.scores.participationsCount} approved</td>
                            <td style={{ color: 'var(--accent-social)', fontWeight: 600 }}>{dept.scores.social}</td>
                            <td>{dept.scores.policyAckRate}%</td>
                            <td style={{ color: dept.scores.overdueIssues > 0 ? '#ef4444' : undefined, fontWeight: dept.scores.overdueIssues > 0 ? 600 : undefined }}>{dept.scores.overdueIssues} open</td>
                            <td style={{ color: 'var(--accent-gov)', fontWeight: 600 }}>{dept.scores.governance}</td>
                            <td style={{ fontWeight: 700, color: 'var(--accent-overall)' }}>{dept.scores.total}</td>
                          </>
                        )}

                        {/* Environmental details */}
                        {preconfiguredReport === 'env' && (
                          <>
                            <td style={{ fontWeight: 600, color: 'var(--accent-env)' }}>{dept.scores.carbonTotal.toFixed(4)} t CO2e</td>
                            <td>{dept.scores.carbonTarget.toFixed(2)} t CO2e</td>
                            <td style={{ color: carbonPercent > 90 ? '#f87171' : undefined }}>{carbonPercent.toFixed(1)}%</td>
                            <td style={{ fontWeight: 700, color: 'var(--accent-env)' }}>{dept.scores.environmental} / 100</td>
                          </>
                        )}

                        {/* Social details */}
                        {preconfiguredReport === 'soc' && (
                          <>
                            <td>{dept.scores.participationsCount} approved events</td>
                            <td>⭐ {dept.scores.totalXp} XP</td>
                            <td style={{ fontWeight: 700, color: 'var(--accent-social)' }}>{dept.scores.social} / 100</td>
                          </>
                        )}

                        {/* Governance details */}
                        {preconfiguredReport === 'gov' && (
                          <>
                            <td>{dept.scores.policyAckRate}% completion</td>
                            <td style={{ color: dept.scores.overdueIssues > 0 ? '#ef4444' : undefined, fontWeight: dept.scores.overdueIssues > 0 ? 600 : undefined }}>{dept.scores.overdueIssues} critical issues</td>
                            <td style={{ fontWeight: 700, color: 'var(--accent-gov)' }}>{dept.scores.governance} / 100</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Weights summary */}
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span><strong>ESG Framework weights configuration:</strong></span>
              <span>Environmental: {weights.environmental * 100}%</span>
              <span>Social: {weights.social * 100}%</span>
              <span>Governance: {weights.governance * 100}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          SECTION 2: CUSTOM REPORT BUILDER
          ---------------------------------------------------- */}
      {activeView === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Filter Configuration Form Panel */}
          <div className="glass-card print:hidden" style={{ borderLeft: '4px solid var(--accent-overall)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Query Filter Parameters</h3>
            <div className="grid-cols-4" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Vertical Module</label>
                <select className="form-select" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }} value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
                  <option value="all">All Modules</option>
                  <option value="environmental">🍀 Environmental Impact</option>
                  <option value="social">🤝 Social Responsibility</option>
                  <option value="governance">⚖️ Corporate Governance</option>
                  <option value="gamification">🏆 Gamification & Store</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Scope Department</label>
                <select className="form-select" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Assigned Employee</label>
                <select className="form-select" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }} value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
                  <option value="">All Staff</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Target Challenge</label>
                <select className="form-select" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }} value={filterChallenge} onChange={(e) => setFilterChallenge(e.target.value)}>
                  <option value="">All Challenges</option>
                  {challenges.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-cols-4" style={{ gap: '0.75rem', alignItems: 'flex-end' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Category Classification</label>
                <select className="form-select" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name} ({cat.type})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Start Date</label>
                <input type="date" className="form-input" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }} value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>End Date</label>
                <input type="date" className="form-input" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }} value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-env" style={{ flexGrow: 2, padding: '0.45rem 1rem', fontSize: '0.8rem' }} onClick={handleGenerateReport} disabled={loading}>
                  {loading ? 'Compiling...' : '⚡ Generate Report'}
                </button>
                <button className="btn btn-secondary" style={{ flexGrow: 1, padding: '0.45rem', fontSize: '0.8rem' }} onClick={() => handleExportCSV(reportData)} disabled={!reportData}>
                  📥 Excel
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.45rem', fontSize: '0.8rem' }} onClick={handlePrintPDF} disabled={!reportData}>
                  🖨️
                </button>
              </div>
            </div>
          </div>

          {/* Custom Report Results */}
          {reportData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Audited Custom Report Ledger</h3>

              {/* 1. Carbon Transactions Table */}
              {(filterModule === 'all' || filterModule === 'environmental') && reportData.carbonTransactions?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>🍀 Carbon Emissions Ledger</h4>
                  <div className="table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Department</th>
                          <th>Emission Factor</th>
                          <th>Quantity Consumed</th>
                          <th>Total CO2e</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.carbonTransactions.map((tx: any) => (
                          <tr key={tx.id}>
                            <td>{formatDate(tx.date)}</td>
                            <td style={{ fontWeight: 600 }}>{tx.department.name}</td>
                            <td>{tx.emissionFactor.name}</td>
                            <td>{tx.quantity} {tx.emissionFactor.unit}</td>
                            <td style={{ color: 'var(--accent-env)', fontWeight: 700 }}>{tx.co2eTotal.toFixed(4)} t</td>
                            <td><span className="pill pill-info" style={{ fontSize: '0.6rem' }}>{tx.source}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. CSR Participations Table */}
              {(filterModule === 'all' || filterModule === 'social') && reportData.csrParticipations?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>🤝 CSR Advocacy Participations</h4>
                  <div className="table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Employee</th>
                          <th>Department</th>
                          <th>CSR Activity Title</th>
                          <th>Points Earned</th>
                          <th>Approval Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.csrParticipations.map((p: any) => (
                          <tr key={p.id}>
                            <td>{p.completedAt ? formatDate(p.completedAt) : 'Pending'}</td>
                            <td style={{ fontWeight: 600 }}>{p.employee.name}</td>
                            <td>{p.employee.department.name}</td>
                            <td>{p.activity.title}</td>
                            <td style={{ color: 'var(--accent-env)', fontWeight: 600 }}>+{p.pointsEarned} Points</td>
                            <td>
                              <span className={`pill ${p.approvalStatus === 'approved' ? 'pill-success' : 'pill-warning'}`} style={{ fontSize: '0.65rem' }}>
                                {p.approvalStatus.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. Training Completions Table */}
              {(filterModule === 'all' || filterModule === 'social') && reportData.trainingCompletions?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>🎓 ESG Training Certifications</h4>
                  <div className="table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Date Certified</th>
                          <th>Employee Name</th>
                          <th>Department</th>
                          <th>Training Program</th>
                          <th>Hours Credited</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.trainingCompletions.map((tc: any) => (
                          <tr key={tc.id}>
                            <td>{formatDate(tc.completedAt)}</td>
                            <td style={{ fontWeight: 600 }}>{tc.employee.name}</td>
                            <td>{tc.employee.department.name}</td>
                            <td>{tc.course.title}</td>
                            <td style={{ fontWeight: 600 }}>{tc.course.hours.toFixed(1)} hrs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. Audits & Compliance Issues Tables */}
              {(filterModule === 'all' || filterModule === 'governance') && (reportData.audits?.length > 0 || reportData.complianceIssues?.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {reportData.audits?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>⚖️ Governance Compliance Audits</h4>
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
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.audits.map((au: any) => (
                              <tr key={au.id}>
                                <td style={{ fontWeight: 600 }}>{au.title}</td>
                                <td>{au.department.name}</td>
                                <td>{au.auditorName}</td>
                                <td>{formatDate(au.auditDate)}</td>
                                <td>
                                  <span className={`pill ${au.status === 'completed' ? 'pill-success' : 'pill-warning'}`} style={{ fontSize: '0.65rem' }}>
                                    {au.status.toUpperCase()}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 700 }}>{au.score !== null ? `${au.score}/100` : 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {reportData.complianceIssues?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>🛡️ Compliance Violations Log</h4>
                      <div className="table-container">
                        <table className="custom-table">
                          <thead>
                            <tr>
                              <th>Department</th>
                              <th>Severity</th>
                              <th>Description</th>
                              <th>Owner</th>
                              <th>Due Date</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.complianceIssues.map((ci: any) => (
                              <tr key={ci.id}>
                                <td style={{ fontWeight: 600 }}>{ci.department.name}</td>
                                <td>
                                  <span className={`pill ${ci.severity === 'critical' || ci.severity === 'high' ? 'pill-error' : 'pill-warning'}`} style={{ fontSize: '0.65rem' }}>
                                    {ci.severity.toUpperCase()}
                                  </span>
                                </td>
                                <td>{ci.description}</td>
                                <td style={{ fontWeight: 500 }}>{ci.owner}</td>
                                <td>{formatDate(ci.dueDate)}</td>
                                <td>
                                  <span className={`pill ${ci.status === 'resolved' ? 'pill-success' : 'pill-warning'}`} style={{ fontSize: '0.65rem' }}>
                                    {ci.status.toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. Gamification: Challenge Participations & Redemptions */}
              {(filterModule === 'all' || filterModule === 'gamification') && (reportData.challengeParticipations?.length > 0 || reportData.rewardRedemptions?.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {reportData.challengeParticipations?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>🏆 Challenge Progress Logs</h4>
                      <div className="table-container">
                        <table className="custom-table">
                          <thead>
                            <tr>
                              <th>Employee</th>
                              <th>Department</th>
                              <th>Challenge Title</th>
                              <th>Progress</th>
                              <th>XP Awarded</th>
                              <th>Approval Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.challengeParticipations.map((cp: any) => (
                              <tr key={cp.id}>
                                <td style={{ fontWeight: 600 }}>{cp.employee.name}</td>
                                <td>{cp.employee.department.name}</td>
                                <td>{cp.challenge.title}</td>
                                <td>{cp.progress}%</td>
                                <td style={{ fontWeight: 700, color: 'var(--accent-overall)' }}>{cp.xpAwarded} XP</td>
                                <td>
                                  <span className={`pill ${cp.approval === 'approved' ? 'pill-success' : 'pill-warning'}`} style={{ fontSize: '0.65rem' }}>
                                    {cp.approval.toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {reportData.rewardRedemptions?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>🛍️ Reward Store Redemptions Log</h4>
                      <div className="table-container">
                        <table className="custom-table">
                          <thead>
                            <tr>
                              <th>Date Redeemed</th>
                              <th>Employee</th>
                              <th>Department</th>
                              <th>Reward Incentive Item</th>
                              <th>Points Spent</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.rewardRedemptions.map((rr: any) => (
                              <tr key={rr.id}>
                                <td>{formatDate(rr.redeemedAt)}</td>
                                <td style={{ fontWeight: 600 }}>{rr.employee.name}</td>
                                <td>{rr.employee.department.name}</td>
                                <td>{rr.reward.name}</td>
                                <td style={{ fontWeight: 700, color: '#f87171' }}>-{rr.pointsSpent} Points</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Empty report state */}
              {(!reportData.carbonTransactions?.length &&
                !reportData.csrParticipations?.length &&
                !reportData.trainingCompletions?.length &&
                !reportData.complianceIssues?.length &&
                !reportData.audits?.length &&
                !reportData.challengeParticipations?.length &&
                !reportData.rewardRedemptions?.length) && (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No transaction log records match the current filter parameters.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
