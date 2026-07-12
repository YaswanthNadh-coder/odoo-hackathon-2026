'use client';

import { useState } from 'react';

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
}

export default function ReportsPortal({
  departmentScores,
  weights,
  overallScores,
}: ReportsPortalProps) {
  const [filterDept, setFilterDept] = useState('all');

  const filteredScores = filterDept === 'all'
    ? departmentScores
    : departmentScores.filter(d => d.id === filterDept);

  // CSV Export utility
  const handleExportCSV = () => {
    // CSV headers
    const headers = [
      'Department Name',
      'Department Code',
      'Employee Count',
      'Carbon Emissions (t CO2e)',
      'Carbon Target (t CO2e)',
      'Environmental Score',
      'Approved CSR Participations',
      'Employee Total XP',
      'Social Score',
      'Policy Ack Rate (%)',
      'Overdue Compliance Issues',
      'Governance Score',
      'Overall ESG Score',
    ];

    // CSV rows
    const rows = departmentScores.map(dept => [
      dept.name,
      dept.code,
      dept.employeeCount,
      dept.scores.carbonTotal,
      dept.scores.carbonTarget,
      dept.scores.environmental,
      dept.scores.participationsCount,
      dept.scores.totalXp,
      dept.scores.social,
      dept.scores.policyAckRate,
      dept.scores.overdueIssues,
      dept.scores.governance,
      dept.scores.total,
    ]);

    // Add weights/averages summary at the bottom
    rows.push([]); // blank line
    rows.push(['ESG Framework Configurations']);
    rows.push(['Framework Weighted Ratios', `E: ${weights.environmental * 100}%`, `S: ${weights.social * 100}%`, `G: ${weights.governance * 100}%`]);
    rows.push(['Consolidated Index Averages', 'Overall ESG', `E: ${overallScores.environmental}`, `S: ${overallScores.social}`, `G: ${overallScores.governance}`, `Index: ${overallScores.overall}`]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val !== undefined ? val : ''}"`).join(',')),
    ].join('\n');

    // Create download link and click it
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `EcoSphere_ESG_Consolidated_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Configuration & Action buttons */}
      <div className="glass-card flex-between">
        <div>
          <h3 style={{ fontSize: '1.1rem' }}>ESG Reports Center</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
            Filter department scope and export audited spreadsheets.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div>
            <select
              className="form-select"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="all">All Departments Scope</option>
              {departmentScores.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-env" onClick={handleExportCSV}>
            📥 Export CSV Spreadsheet
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid-cols-4">
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

      {/* Main Consolidated Report Table */}
      <div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Consolidated ESG Performance Report</h3>
        <div className="table-container">
          <table className="custom-table">
            <thead>
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
            </thead>
            <tbody>
              {filteredScores.map((dept) => (
                <tr key={dept.id}>
                  <td style={{ fontWeight: 600 }}>{dept.name} ({dept.code})</td>
                  <td>{dept.employeeCount}</td>
                  <td style={{ fontWeight: 500 }}>
                    {dept.scores.carbonTotal.toFixed(2)} / {dept.scores.carbonTarget.toFixed(2)} t
                  </td>
                  <td style={{ color: 'var(--accent-env)', fontWeight: 600 }}>{dept.scores.environmental}</td>
                  <td>{dept.scores.participationsCount} approved</td>
                  <td style={{ color: 'var(--accent-social)', fontWeight: 600 }}>{dept.scores.social}</td>
                  <td>{dept.scores.policyAckRate}%</td>
                  <td style={{ color: dept.scores.overdueIssues > 0 ? '#ef4444' : undefined, fontWeight: dept.scores.overdueIssues > 0 ? 600 : undefined }}>
                    {dept.scores.overdueIssues} open
                  </td>
                  <td style={{ color: 'var(--accent-gov)', fontWeight: 600 }}>{dept.scores.governance}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-overall)' }}>{dept.scores.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
