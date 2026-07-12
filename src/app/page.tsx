import Link from 'next/link';
import { calculateESGStats } from '@/lib/esg-calc';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';
import { formatDate } from '@/lib/date';
import InteractiveTrendChart from '@/components/InteractiveTrendChart';

export const revalidate = 0; // Disable caching so it always gets the latest data

export default async function DashboardPage() {
  const session = await getSession();
  const stats = await calculateESGStats();

  // Fetch recent activities/events to show in notifications/alerts
  const recentIssues = await prisma.complianceIssue.findMany({
    where: { status: 'open' },
    include: { department: true },
    orderBy: { dueDate: 'asc' },
    take: 2,
  });

  const recentCSR = await prisma.employeeParticipation.findMany({
    where: { approvalStatus: 'pending' },
    include: { employee: true, activity: true },
    take: 2,
  });

  // Calculate carbon transactions trend data (last 5 entries for graph)
  const recentTx = await prisma.carbonTransaction.findMany({
    include: { department: true },
    orderBy: { date: 'desc' },
    take: 8,
  });

  // Sort chronologically for the chart
  const chronologicalTx = [...recentTx].reverse();
  const chartPoints = chronologicalTx.map((tx, idx) => {
    return {
      x: idx * 55 + 25,
      y: 120 - Math.min(100, (tx.co2eTotal / 10) * 100), // scale down to 120px height
      label: tx.department.code,
      value: tx.co2eTotal.toFixed(2),
      date: formatDate(tx.date.toISOString()),
    };
  });

  // Generate SVG path for line chart
  let svgPath = '';
  if (chartPoints.length > 0) {
    svgPath = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 1; i < chartPoints.length; i++) {
      // Create a smooth cubic curve between points
      const prev = chartPoints[i - 1];
      const curr = chartPoints[i];
      const cp1x = prev.x + 25;
      const cp1y = prev.y;
      const cp2x = curr.x - 25;
      const cp2y = curr.y;
      svgPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
  }

  return (
    <div className="page-fade-in">
      <div className="flex-between mb-8">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>EcoSphere Executive Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Consolidated Environmental, Social, and Governance performance indexes.
          </p>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Database Connection: <span className="pill pill-success">SQLite Live</span>
        </div>
      </div>

      {/* ESG Scoring Circle Cards */}
      <div className="grid-cols-4 mb-8">
        {/* Environmental Score */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--accent-env)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Environmental Score</h3>
          <div className="score-circle-wrapper">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="url(#env-grad)" strokeWidth="8" 
                strokeDasharray="314" 
                strokeDashoffset={314 - (314 * stats.environmental) / 100}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
              <defs>
                <linearGradient id="env-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
            <div className="score-circle-text">
              <span className="score-circle-number" style={{ color: 'var(--accent-env)' }}>{stats.environmental}</span>
              <span className="score-circle-label">/ 100</span>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Carbon accounting vs target limits
          </p>
        </div>

        {/* Social Score */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--accent-social)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Social Score</h3>
          <div className="score-circle-wrapper">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="url(#social-grad)" strokeWidth="8" 
                strokeDasharray="314" 
                strokeDashoffset={314 - (314 * stats.social) / 100}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
              <defs>
                <linearGradient id="social-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <div className="score-circle-text">
              <span className="score-circle-number" style={{ color: '#818cf8' }}>{stats.social}</span>
              <span className="score-circle-label">/ 100</span>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Employee CSR participation & XP
          </p>
        </div>

        {/* Governance Score */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--accent-gov)' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Governance Score</h3>
          <div className="score-circle-wrapper">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="url(#gov-grad)" strokeWidth="8" 
                strokeDasharray="314" 
                strokeDashoffset={314 - (314 * stats.governance) / 100}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
              <defs>
                <linearGradient id="gov-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
            </svg>
            <div className="score-circle-text">
              <span className="score-circle-number" style={{ color: 'var(--accent-gov)' }}>{stats.governance}</span>
              <span className="score-circle-label">/ 100</span>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Audit compliance & policy sign-off
          </p>
        </div>

        {/* Overall ESG Score */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--accent-overall)', background: 'linear-gradient(135deg, rgba(17,24,39,0.7), rgba(6,182,212,0.03))' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Overall ESG Score</h3>
          <div className="score-circle-wrapper">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="url(#overall-grad)" strokeWidth="8" 
                strokeDasharray="314" 
                strokeDashoffset={314 - (314 * stats.overall) / 100}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
              <defs>
                <linearGradient id="overall-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#0891b2" />
                </linearGradient>
              </defs>
            </svg>
            <div className="score-circle-text">
              <span className="score-circle-number" style={{ color: 'var(--accent-overall)' }}>{stats.overall}</span>
              <span className="score-circle-label">Index</span>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Weighted: {stats.weights.environmental * 100}% E | {stats.weights.social * 100}% S | {stats.weights.governance * 100}% G
          </p>
        </div>
      </div>

      {/* Main Grid - Chart + Quick Actions */}
      <div className="grid-cols-3 mb-8">
        {/* Trend Chart (Glass Card spanning 2 cols equivalent) */}
        <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', height: '320px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Database Carbon Emission Trend</h3>
          <div style={{ flexGrow: 1, position: 'relative', minHeight: '160px' }}>
            <InteractiveTrendChart chartPoints={chartPoints} svgPath={svgPath} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', marginTop: 'auto' }}>
            <span>⚡ Carbon Transactions (t CO2e)</span>
            <span style={{ marginLeft: 'auto' }}>Recent Logs &gt;</span>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>Quick Actions</h3>
          <Link href="/environmental" className="btn btn-env" style={{ justifyContent: 'flex-start' }}>
            <span>🍀</span> Log Carbon Transaction
          </Link>
          <Link href="/social" className="btn btn-secondary" style={{ justifyContent: 'flex-start', borderLeft: '3px solid var(--accent-social)' }}>
            <span>🤝</span> Register CSR Activities
          </Link>
          <Link href="/governance" className="btn btn-secondary" style={{ justifyContent: 'flex-start', borderLeft: '3px solid var(--accent-gov)' }}>
            <span>🛡️</span> Report Compliance Issue
          </Link>
          <Link href="/gamification" className="btn btn-secondary" style={{ justifyContent: 'flex-start', borderLeft: '3px solid var(--accent-overall)' }}>
            <span>🏆</span> View Active Challenges
          </Link>
        </div>
      </div>

      {/* Row 3 - Department Ranking Table + Alerts */}
      <div className="grid-cols-3">
        {/* Department Ranking Table (Spans 2 columns) */}
        <div style={{ gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Department ESG Rankings</h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Carbon (Actual/Target)</th>
                  <th>E Score</th>
                  <th>S Score</th>
                  <th>G Score</th>
                  <th>Overall</th>
                </tr>
              </thead>
              <tbody>
                {stats.departmentScores
                  .sort((a, b) => b.scores.total - a.scores.total)
                  .map((dept) => (
                    <tr key={dept.id}>
                      <td style={{ fontWeight: 600 }}>
                        {dept.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>({dept.code})</span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {dept.scores.carbonTotal} / {dept.scores.carbonTarget} t
                      </td>
                      <td>
                        <span style={{ color: 'var(--accent-env)', fontWeight: 600 }}>{dept.scores.environmental}</span>
                      </td>
                      <td>
                        <span style={{ color: '#818cf8', fontWeight: 600 }}>{dept.scores.social}</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--accent-gov)', fontWeight: 600 }}>{dept.scores.governance}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700 }}>{dept.scores.total}</span>
                          <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${dept.scores.total}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-overall), #0284c7)', borderRadius: '3px' }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Alerts & Notifications */}
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Active Notifications</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentIssues.map((issue) => (
              <div key={issue.id} className="glass-card" style={{ padding: '1rem', borderLeft: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.02)' }}>
                <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
                  <span className="pill pill-error" style={{ fontSize: '0.65rem' }}>Overdue Issue</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{issue.department.code}</span>
                </div>
                <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{issue.description}</p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Owner: {issue.owner} | Due: {formatDate(issue.dueDate)}
                </div>
              </div>
            ))}

            {recentCSR.map((participation) => (
              <div key={participation.id} className="glass-card" style={{ padding: '1rem', borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.02)' }}>
                <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
                  <span className="pill pill-info" style={{ fontSize: '0.65rem' }}>CSR Approval</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending</span>
                </div>
                <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {participation.employee.name} joined &ldquo;{participation.activity.title}&rdquo;
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Needs department head approval.
                </div>
              </div>
            ))}

            {recentIssues.length === 0 && recentCSR.length === 0 && (
              <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                🟢 All systems compliant. No pending notifications.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
