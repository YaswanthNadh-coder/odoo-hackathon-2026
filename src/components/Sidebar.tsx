'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  session: {
    employeeId: string;
    name: string;
    role: string;
    departmentId: string;
    departmentName: string;
    departmentCode: string;
  } | null;
}

export default function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();

  const isLinkActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🌿</div>
        <span>EcoSphere</span>
      </div>

      <nav style={{ flexGrow: 1 }}>
        <ul className="nav-menu">
          <li className="nav-group-title">Overview</li>
          <li>
            <Link href="/" className={`nav-link ${isLinkActive('/') ? 'active' : ''}`}>
              <span>📊</span>
              <span>Dashboard</span>
            </Link>
          </li>

          <li className="nav-group-title">ESG Verticals</li>
          <li>
            <Link href="/environmental" className={`nav-link ${isLinkActive('/environmental') ? 'active' : ''}`}>
              <span>🍀</span>
              <span>Environmental</span>
            </Link>
          </li>
          <li>
            <Link href="/social" className={`nav-link ${isLinkActive('/social') ? 'active' : ''}`}>
              <span>🤝</span>
              <span>Social</span>
            </Link>
          </li>
          <li>
            <Link href="/governance" className={`nav-link ${isLinkActive('/governance') ? 'active' : ''}`}>
              <span>⚖️</span>
              <span>Governance</span>
            </Link>
          </li>

          <li className="nav-group-title">Culture & Insights</li>
          <li>
            <Link href="/gamification" className={`nav-link ${isLinkActive('/gamification') ? 'active' : ''}`}>
              <span>🏆</span>
              <span>Gamification</span>
            </Link>
          </li>
          <li>
            <Link href="/reports" className={`nav-link ${isLinkActive('/reports') ? 'active' : ''}`}>
              <span>📁</span>
              <span>Reports</span>
            </Link>
          </li>
          <li>
            <Link href="/settings" className={`nav-link ${isLinkActive('/settings') ? 'active' : ''}`}>
              <span>⚙️</span>
              <span>Settings</span>
            </Link>
          </li>
        </ul>
      </nav>

      {session && (
        <div 
          style={{ 
            marginTop: 'auto', 
            padding: '0.75rem', 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid rgba(255, 255, 255, 0.05)', 
            borderRadius: 'var(--radius-md)' 
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role Switcher Session</div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', margin: '0.15rem 0' }}>{session.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'between' }}>
            <span>Dept: {session.departmentCode}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--accent-gov)', fontWeight: 600 }}>{session.role.toUpperCase()}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
